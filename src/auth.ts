import { unauthorized } from "next/navigation";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import ky from "ky";

import prisma from "~/db";

import {
  ALLOWED_DISCORD_SERVERS,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
} from "~/env";

const allowedServers = new Set(ALLOWED_DISCORD_SERVERS);

export const guildsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    owner: z.boolean(),
    permissions: z.number(),
    permissions_new: z.string(),
    features: z.array(z.string()),
  }),
);

const getAllowedGuilds = async (token: string) => {
  // for reasons that absolutely baffle me, hitting the home route after the
  // first load (for example, by manually going to http://localhost:3000 in the
  // address bar after you're redirected) will cause this request to time out --
  // ky's timeout parameter won't trigger, but you can `Promise.race()` the
  // fetch against a `setTimeout().then(() => { throw ... })` to see for
  // yourself.
  //
  // this is absolutely mind-boggling and frightening to me, but for some reason
  // it doesn't happen in prod. yet another reason to migrate to astro at first
  // opportunity, i guess...
  console.log("fetching guilds");

  const guilds = await ky("https://discordapp.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${token}` },
    fetch: (input, init) =>
      // this seems to get ignored with the reason "(cache-control: no-cache
      // (hard refresh))" even though the response doesn't seem to set these
      // headers -- maybe our auth header disables it? fetch logging is disabled
      // in production, so it's remarkably hard to tell whether anything is
      // being cached at all.
      fetch(input, { cache: "force-cache", next: { revalidate: 30 }, ...init }),
  }).json();

  return guildsSchema.parse(guilds).filter((g) => allowedServers.has(g.id));
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  // debug: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      // we need the "guilds" scope to be able to see which servers the user
      // belongs to. we also remove the email permission, which appears to be
      // optional even though auth.js defaults to asking for it.
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: { scope: "identify guilds" },
      },
    }),
  ],
  callbacks: {
    // users can only sign in if they're a member of a whitelisted org.
    async signIn({ account }) {
      const token = account?.access_token;

      if (!token) {
        console.error(
          "Unexpected missing field when attempting to sign in!",
          "Account should contain field 'access_token'.",
        );
        return false;
      }

      const allowedGuilds = await getAllowedGuilds(token);

      if (allowedGuilds.length === 0) {
        return false;
      }

      // HACK: next-auth doesn't seem to update the account with the new tokens
      // when an existing account logs in??
      //
      // TODO: also update user name and image (in session callback/token
      // refresh too)
      {
        const userWhere = {
          where: {
            provider_providerAccountId: {
              providerAccountId: account.providerAccountId,
              provider: account.provider,
            },
          },
        };

        const existingAccount = await prisma.account.findUnique(userWhere);
        if (existingAccount) {
          await prisma.account.update({
            ...userWhere,
            data: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
            },
          });
        }
      }

      return true;
    },
    async session({ user, session }) {
      console.log("session callback for user", user.name);

      // the token isn't made available here, so we have to hit the db. i've
      // also had to add an index to the userId column of the Account model to
      // this end... i assume there isn't one by default because there can
      // technically be many accounts for a given userId when multiple providers
      // are configured. but we only use one!
      const { access_token } = await prisma.account.findFirstOrThrow({
        where: { userId: user.id },
        select: { access_token: true },
      });

      // FIXME: we need to implement the refresh token flow here:
      // https://authjs.dev/guides/refresh-token-rotation#database-strategy
      // https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response

      // TODO: also clean up old sessions -- they stay in the database forever,
      // even when the timestamp shows they're expired

      if (!access_token) {
        throw new Error(
          "Unexpected missing access_token when building session!",
        );
      }

      const guilds = await getAllowedGuilds(access_token);

      if (guilds.length === 0) {
        console.warn("User does not appear to belong to any allowed guilds!");
        unauthorized();
      }

      const { email, emailVerified, ...strippedUser } = user;

      const data = {
        user: {
          ...strippedUser,
          guilds: guilds.map(({ name, icon, id }) => ({
            name,
            id,
            icon: `https://cdn.discordapp.com/icons/${id}/${icon}.png`,
          })),
        },
        expires: session.expires,
      };

      return data;
    },
  },
});

export interface Guild {
  name: string;
  icon: string;
  id: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      image: string;
      guilds: Guild[];
    };
    expires: Date & string;
  }
}

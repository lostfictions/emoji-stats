/* eslint-disable node/no-process-env */

import { parseEnv, z } from "znv";

export const {
  DB_URL,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_TOKEN,
  ALLOWED_DISCORD_SERVERS,
  AUTH_URL,
  SENTRY_DSN,
} = parseEnv(process.env, {
  DB_URL: {
    schema: z.string().startsWith("file:"),
    description: "A database connection url string.",
  },
  DISCORD_CLIENT_ID: {
    schema: z.string().min(1),
    description: "The OAuth client id for Discord login.",
  },
  DISCORD_CLIENT_SECRET: {
    schema: z.string().min(1),
    description: "The OAuth client secret for Discord login.",
  },
  DISCORD_TOKEN: {
    schema: z.string().min(1),
    description: "The token for the Discord socket client.",
  },
  ALLOWED_DISCORD_SERVERS: {
    schema: z.array(z.string().min(1)).min(1),
    defaults: {
      _: [],
    },
    description: [
      "JSON array of Discord Guild (server) ids. Users attempting to sign in",
      "with Discord will only successfully authenticate if they belong to at",
      "least one of these orgs.",
    ].join("\n"),
  },
  AUTH_URL: {
    schema: z.string().url().optional(),
    description:
      "The domain the site is running on. Optional: auth.js will try to infer it, but we also use it for OpenGraph tags.",
  },
  SENTRY_DSN: {
    schema: z.string().min(1),
  },
  // Validated but not exported; pulled directly from process.env by next-auth.
  NEXTAUTH_SECRET: {
    schema: z.string().min(1),
    description: [
      "Used for encrypting/signing JWTs and cookies.",
      "See https://next-auth.js.org/configuration/options#secret for details.",
    ].join("\n"),
  },
});

export const isProd = process.env.NODE_ENV === "production";

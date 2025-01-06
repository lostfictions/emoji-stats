import { notFound, unauthorized } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { getEmojiByDate } from "@prisma/client/sql";

import { auth, signOut as authSignOut, type Guild } from "~/auth";
import prisma from "~/db";
import { Header } from "~/components/Header";
import { Chart } from "~/components/Chart";

export default async function Home({
  params,
}: {
  params: Promise<{ guild: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    unauthorized();
  }

  const { guild } = await params;

  const { name, image, guilds } = session.user;

  const i = guilds.findIndex((g) => g.id === guild);
  if (i === -1) {
    notFound();
  }

  const activeGuild = guilds[i];
  const guildsWithoutActive = guilds.toSpliced(i, 1);

  return (
    <>
      <Header
        activeGuild={activeGuild}
        otherGuilds={guildsWithoutActive}
        profile={{ name, image }}
        signOutAction={signOut}
      />
      <main className="mt-8 flex flex-col items-center pb-8">
        <EmojiData guild={activeGuild} />
      </main>
    </>
  );
}

async function signOut() {
  "use server";
  await authSignOut();
}

async function EmojiData({ guild }: { guild: Guild }) {
  const emojiByDate = await prisma.$queryRawTyped(
    getEmojiByDate(
      guild.id,
      Date.now() - 1000 * 60 * 60 * 24 * 60,
      Date.now() + 1000 * 60 * 60 * 24,
    ),
  );

  const emojiWithUsage = await prisma.emoji.findMany({
    where: { guildId: guild.id },
    select: {
      id: true,
      name: true,
      createdOn: true,
      _count: { select: { EmojiUsage: true } },
    },
    orderBy: { EmojiUsage: { _count: "desc" } },
  });

  return (
    <div className="flex flex-col">
      <div className="mt-4 rounded bg-slate-800 p-4">
        <div className="flex justify-center text-xl font-bold">
          Emoji of da month
        </div>

        <div className="h-[70vh] min-h-96 w-[90vw] sm:w-[80vw]">
          <Chart data={emojiByDate} />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center rounded bg-slate-800 p-4">
        <div className="flex justify-center text-xl font-bold">
          All-time leaderboard
        </div>
        <div className="mt-4 flex min-w-[90vw] max-w-[600px] flex-col gap-1 sm:min-w-[400px]">
          {emojiWithUsage.length === 0 ? (
            <div className="flex justify-center">No data available!</div>
          ) : (
            emojiWithUsage.map((e) => (
              <div
                key={e.id}
                className="flex flex-row items-center justify-between gap-8 bg-slate-700 p-4"
              >
                <img
                  className="size-8 object-contain"
                  src={`https://cdn.discordapp.com/emojis/${e.id}.png`}
                  title={`:${e.name}:`}
                />
                <div className="flex-1 justify-self-start">
                  <span>:{e.name}:</span>
                  <span
                    className="ml-4 text-slate-50/60"
                    title={`Added ${e.createdOn.toDateString()}`}
                  >
                    {`(Added ${formatDistanceToNowStrict(e.createdOn, { addSuffix: true })})`}
                  </span>
                </div>
                <div>{e._count.EmojiUsage}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

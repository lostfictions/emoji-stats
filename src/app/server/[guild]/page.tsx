import { notFound, unauthorized } from "next/navigation";
import { differenceInMonths, formatDistanceToNowStrict } from "date-fns";

import { auth, signOut as authSignOut, type Guild } from "~/auth";
import prisma from "~/db";
import { Header } from "~/components/Header";
import { Chart } from "~/components/Chart";
import cx from "~/lib/cx";

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

export type EmojiByDate = {
  day: string;
  id: string;
  name: string;
  count: bigint;
}[];

function getEmojiByDate({
  guild,
  startTime,
  endTime,
}: {
  guild: string;
  startTime: number;
  endTime: number;
}): Promise<EmojiByDate> {
  // note that we GROUP BY formatted date here, which can lead to
  // inconsistencies since everything is in UTC (eg. emoji usages may be
  // bucketed into what look like future dates relative to the user's local
  // time). strftime() accepts an offset, but there's no easy way to get the
  // client's timezone when it requests a page (we could send it along as a
  // header or param in an api request, but not a page request). rather than
  // doing elaborate bookkeeping to make this work, let's... somewhat
  // arbitrarily set this to PST. that means users who are on UTC-4 (eg. EDT)
  // will see their messages posted up until 4am will be bucketed to the
  // previous day, which is fine. the real issue is for people outside the
  // Americas... sorry folks, maybe i'll fix this someday.
  return prisma.$queryRaw`
    SELECT
      strftime('%F', ROUND(date / 1000), 'unixepoch', '-08:00') day,
      id,
      name,
      count(1) count
    FROM EmojiUsage u, Emoji e
    WHERE
      u.emojiId = e.id
      AND guildId = ${guild}
      AND date > ${startTime}
      AND date < ${endTime}
    GROUP BY emojiId, day
    ORDER BY day ASC, count DESC;
  `;
}

async function EmojiData({ guild }: { guild: Guild }) {
  // FIXME: make these configurable, pass to <Chart /> so it can render ticks
  // for leading and trailing empty days
  const startTime = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const endTime = Date.now() + 1000 * 60 * 60 * 24;

  const emojiByDate = await getEmojiByDate({
    guild: guild.id,
    startTime,
    endTime,
  });

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

  // to avoid inconsistencies in the rendered date we need to use the same
  // strftime() with offset as in getEmojiByDate above.
  //
  // note that this query is across *all* usages, not scoped by guild. the
  // earliest EmojiUsage row (roughly) represents when we started tracking, not
  // the first time reactions were used in a given guild.
  const [{ earliest }] = await prisma.$queryRaw<[{ earliest: string }]>`
    SELECT
      strftime('%F', ROUND(min(date) / 1000), 'unixepoch', '-08:00') earliest
    FROM EmojiUsage;
  `;

  const now = new Date();

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
        {earliest ? (
          <div className="flex justify-center text-sm">
            since{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "utc",
            }).format(new Date(earliest))}
          </div>
        ) : null}
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
                    className={cx(
                      "ml-4 text-sm",
                      differenceInMonths(now, e.createdOn) > 6
                        ? "text-slate-50/20"
                        : "text-slate-50/70",
                    )}
                    title={`Added ${e.createdOn.toDateString()}`}
                  >
                    {`(${formatDistanceToNowStrict(e.createdOn)} old)`}
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

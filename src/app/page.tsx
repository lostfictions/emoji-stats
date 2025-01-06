import { unauthorized } from "next/navigation";

import { auth } from "~/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    unauthorized();
  }

  const { guilds } = session.user;

  if (!guilds[0]?.id) {
    throw new Error(
      `Expected non-empty array of guilds, got ${JSON.stringify(guilds)}`,
    );
  }

  // HACK: we'd rather use `redirect()` from `next/navigation` -- but it seems
  // to blow something up when we redirect to another page with auth. but only
  // the SECOND time we load it. and only in dev! something must be going
  // horribly wrong internally even for this small trivial site but i'm going to
  // try to not investigate further. doing a client-side redirect seems to work.
  //
  // however there's still issues when signing in -- it seems to hang
  // indefinitely on the fetch call to the discord api for reasons unknown.
  //
  // hell yes server components!! hell yes next!! hell yes auth.js
  return (
    <meta httpEquiv="refresh" content={`0; url=/server/${guilds[0].id}`} />
  );
}

import { headers } from "next/headers";
import { signIn } from "~/auth";

export default async function UnauthorizedPage() {
  const h = await headers();

  // hopefully this isn't an open redirect lmao
  // we have no way to know where we are:
  // https://github.com/vercel/next.js/issues/43704#issuecomment-2090798307
  const referer = h.get("referer");

  async function signInWithDiscord() {
    "use server";
    await signIn("discord", { redirectTo: referer ?? "/" }, { prompt: "none" });
  }

  return (
    <>
      <p>Not signed in.</p>
      <form action={signInWithDiscord}>
        <button type="submit">Sign in</button>
      </form>
    </>
  );
}

export async function register() {
  // @ts-expect-error next.js needs the literal string "process.env.NEXT_RUNTIME"
  // eslint-disable-next-line node/no-process-env -- ditto
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { run: initializeDiscordListener } = await import("./discord");
    await initializeDiscordListener();
  } else {
    throw new Error("unknown next.js runtime! expected to be running in node");
  }
}

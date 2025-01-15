import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  // @ts-expect-error next.js needs the literal string "process.env.NEXT_RUNTIME"
  // eslint-disable-next-line node/no-process-env -- ditto
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await initSentry();

    const { run: initializeDiscordListener } = await import("./discord");
    await initializeDiscordListener();
  } else {
    throw new Error("unknown next.js runtime! expected to be running in node");
  }
}

async function initSentry() {
  const { SENTRY_DSN, isProd } = await import("~/env");

  if (isProd) {
    const { init, captureConsoleIntegration } = await import("@sentry/nextjs");

    init({
      dsn: SENTRY_DSN,
      integrations: [
        captureConsoleIntegration({
          levels: ["warn", "error", "debug", "assert"],
        }),
      ],
    });
  }
}

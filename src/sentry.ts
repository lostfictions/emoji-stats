export async function initSentry() {
  const { SENTRY_DSN, isProd } = await import("./env");

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

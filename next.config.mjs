// @ts-check
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = /** @type {import('next').NextConfig} */ ({
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  // we typecheck and lint ourselves in separate processes, no need to do it for us
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  logging: { fetches: { fullUrl: true, hmrRefreshes: true } },
  experimental: {
    authInterrupts: true,
  },
});

// btw this balloons build time to about 4 minutes?? cool
export default withSentryConfig(nextConfig, {
  sourcemaps: { disable: true },
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: false,
  disableLogger: true,
  telemetry: false,
  silent: true,
});

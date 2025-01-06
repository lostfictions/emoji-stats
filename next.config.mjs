// @ts-check
export default /** @type {import('next').NextConfig} */ ({
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

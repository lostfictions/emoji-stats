# should match value in .node-version file
ARG NODE_VERSION=22.13.0

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
# openssl needed for prisma, jq for our deps hack
RUN apt-get update -y \
  && apt-get install --no-install-recommends -y openssl=3.0.15-1~deb12u1 jq=1.6-2.1 \
  && rm -rf /var/cache/apt/archives /var/lib/apt/lists
RUN corepack enable
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY package.json next.config.mjs postcss.config.json tailwind.config.js tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
# use env file with dummy values for build
COPY .env.dummy ./.env.local
RUN pnpm install --offline --frozen-lockfile
# disable prisma telemetry
ENV CHECKPOINT_DISABLE=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:migrate && DB_URL='file:dev.db' pnpm build
# we ignore discord.js from next's standalone tracing via /* webpack-ignore */,
# so it -- and its transitive dependencies -- need to be copied over manually.
COPY package.json ./package-old.json
RUN jq '{packageManager, dependencies: (.dependencies | {"discord.js": .["discord.js"]})}' package-old.json > package.json \
  && rm -rf node_modules \
  && pnpm install --offline --no-frozen-lockfile \
  && cp -r node_modules .next/standalone/

FROM node:${NODE_VERSION}-slim
WORKDIR /app
# openssl needed for prisma
RUN apt-get update -y \
  && apt-get install --no-install-recommends -y openssl=3.0.15-1~deb12u1 \
  && rm -rf /var/cache/apt/archives /var/lib/apt/lists
ENV NODE_ENV=production
# disable prisma telemetry
ENV CHECKPOINT_DISABLE=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs
# standalone folder can go to the root of the workdir, but the static dir needs
# its path preserved (ie. it ends up within the standalone dir)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

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
COPY package.json ./
RUN pnpm install --offline --frozen-lockfile
COPY next.config.mjs postcss.config.json tailwind.config.js tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
# we could just copy public/ directly into our runner image, but for uniformity the
# build script expects it to be present to copy into the build folder.
COPY public ./public
# use env file with dummy values for build
COPY .env.dummy ./.env.local
# disable prisma telemetry
ENV CHECKPOINT_DISABLE=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
RUN pnpm db:migrate && DB_URL='file:dev.db' pnpm build
# we ignore discord.js from next's standalone tracing via /* webpack-ignore */,
# so it -- and its transitive dependencies -- need to be copied over manually.
# this is a bit annoying to do here but docker's COPY doesn't have any option to
# make it behave like `cp -r`, so we can't really split it out to a separate
# stage.
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
# we'd normally need to copy .next/static and the public folder too, but our
# build script in package.json does that for us.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

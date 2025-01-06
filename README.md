# Emoji Stats

A Next.js application that tracks emoji usage and provides a site you can visit to see fancy usage stats

## Setup

Make sure you're on the version of Node that matches what's in [the `.node-version` file](.node-version). One of the nicest (if not quite the easiest) ways to do this is to use [`fnm`](https://github.com/Schniz/fnm).

Then, ensure [corepack](https://nodejs.org/docs/latest-v22.x/api/corepack.html) is enabled:

```sh
corepack enable
```

Next, install deps with [pnpm](https://pnpm.io/):

```sh
pnpm install
```

Set up your `.env` file from the example:

```sh
cp .env.dummy .env.local
```

Then fill in the correct values.

Finally, spin up the dev server:

```sh
pnpm start
```

## Docker

To build the Docker image locally:

```sh
docker build \
  --build-arg NODE_VERSION="$(cat .node-version)" \
  -t emoji-stats \
  .
```

Then run it like this:

```sh
docker run --rm -it \
  -p 3000:3000 \
  -v "$(pwd)"/.env:/app/.env:ro \
  emoji-stats
```

This mounts your `.env` file (which could also be a different file that you mount in the container under the same name) so as to avoid having to pass each env var as parameters to `docker run`.

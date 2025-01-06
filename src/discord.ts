export async function run() {
  // webpackIgnore is the only thing that makes this work for me -- otherwise
  // webpack/next chokes on the native imports. see
  // https://github.com/vercel/next.js/issues/49565#issuecomment-2253491460
  // notably, this doesn't work:
  // https://www.armannotes.com/2024/02/12/zlib-error-nextjs-server-actions/
  const {
    Client: DiscordClient,
    GatewayIntentBits,
    GuildEmoji,
    ChannelType,
  } = await import(
    /* webpackIgnore: true */
    "discord.js"
  );
  const { DISCORD_TOKEN } = await import("./env");
  const { default: prisma } = await import("./db");

  const client = new DiscordClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildExpressions,
    ],
  });

  client.on("threadCreate", (thread, newlyCreated) => {
    if (newlyCreated && thread.joinable) {
      thread.join().catch((e: unknown) => {
        throw e;
      });
    }
  });

  client.on("messageReactionAdd", ({ message, emoji }, user) => {
    const channelType = message.channel.type;
    if (
      user.bot ||
      !(emoji instanceof GuildEmoji) ||
      !(
        channelType === ChannelType.GuildText ||
        channelType === ChannelType.PublicThread
      )
    ) {
      return;
    }

    const channelId =
      channelType === ChannelType.PublicThread
        ? message.channel.parentId
        : message.channelId;

    if (channelId == null) {
      console.error(
        `Can't retrieve parent for thread "${message.channel.name}" [${message.channelId}] (in guild "${message.guild?.name}" [${message.guildId}])`,
      );
      return;
    }

    if (!emoji.name) {
      console.error(
        `Can't retrieve name for emoji "${emoji.name}" [${emoji.id}] (in guild "${message.guild?.name}" [${message.guildId}])`,
      );
      return;
    }

    prisma.emojiUsage
      .create({
        data: {
          messageId: message.id,
          userId: user.id,
          channelId,
          emoji: {
            connectOrCreate: {
              where: { id: emoji.id },
              create: {
                id: emoji.id,
                guildId: emoji.guild.id,
                name: emoji.name,
                createdOn: emoji.createdAt,
              },
            },
          },
        },
      })
      .catch((e: unknown) => {
        throw e;
      });
  });

  client.on("messageReactionRemove", ({ message, emoji }, user) => {
    const channelType = message.channel.type;
    if (
      user.bot ||
      !(emoji instanceof GuildEmoji) ||
      !(
        channelType === ChannelType.GuildText ||
        channelType === ChannelType.PublicThread
      )
    ) {
      return;
    }

    prisma.emojiUsage
      .delete({
        where: {
          messageId_userId_emojiId: {
            messageId: message.id,
            userId: user.id,
            emojiId: emoji.id,
          },
        },
      })
      .catch((e: unknown) => {
        throw e;
      });
  });

  client.on("emojiUpdate", (emoji) => {
    // Bad typings afaik, GuildEmoji should always have a name
    if (!emoji.name) {
      console.error(
        `Can't retrieve name for emoji "${emoji.name}" [${emoji.id}] (in guild "${emoji.guild.name}" [${emoji.guild.id}])`,
      );
      return;
    }

    prisma.emoji
      .update({
        where: { id: emoji.id },
        data: { name: emoji.name },
      })
      .catch((e: unknown) => {
        throw e;
      });
  });

  client.on("emojiDelete", (emoji) => {
    prisma.emoji
      .update({
        where: { id: emoji.id },
        data: { deletedOn: new Date() },
      })
      .catch((e: unknown) => {
        throw e;
      });
  });
  // TODO: also handle emoji deleted when bot was offline

  client.on("channelDelete", (channel) => {
    const channelType = channel.type;
    if (channelType !== ChannelType.GuildText) return;

    prisma.emojiUsage
      .deleteMany({ where: { channelId: channel.id } })
      .catch((e: unknown) => {
        throw e;
      });
  });

  client.on("guildDelete", (guild) => {
    prisma.emoji
      .deleteMany({ where: { guildId: guild.id } })
      .catch((e: unknown) => {
        throw e;
      });
  });

  await client.login(DISCORD_TOKEN);

  // // initialize emoji
  // for (const [, g] of await client.guilds.fetch()) {
  //   const guild = await g.fetch();
  //   const emoji = [...(await guild.emojis.fetch()).values()];
  //   for (const e of emoji) {
  //     // Bad typings afaik, GuildEmoji should always have a name
  //     if (!e.name) {
  //       console.error(
  //         `Unexpected missing name for emoji ${String(e.toJSON())}`,
  //       );
  //       continue;
  //     }

  //     await prisma.emoji.upsert({
  //       where: { id: e.id },
  //       update: {
  //         guildId: e.guild.id,
  //         name: e.name,
  //         createdOn: e.createdAt,
  //       },
  //       create: {
  //         id: e.id,
  //         guildId: e.guild.id,
  //         name: e.name,
  //         createdOn: e.createdAt,
  //       },
  //     });
  //   }
  // }

  console.log(`signed in as "${client.user!.username}"`);
}

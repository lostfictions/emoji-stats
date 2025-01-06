"use client";

import Link from "next/link";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

import type { Guild } from "~/auth";

const guildRowItem = "flex flex-row items-center gap-4 px-4";

export function Header({
  activeGuild,
  otherGuilds,
  profile,
  signOutAction,
}: {
  activeGuild: Guild;
  otherGuilds: Guild[];
  profile: { name: string; image: string };
  signOutAction: () => Promise<void>;
}) {
  return (
    <header className="flex items-stretch justify-end bg-slate-950">
      {otherGuilds.length === 0 ? (
        <div className={guildRowItem}>
          <img src={activeGuild.icon} className="size-8 rounded-full" />
          <div>{activeGuild.name}</div>
        </div>
      ) : (
        <GuildMenu activeGuild={activeGuild} otherGuilds={otherGuilds} />
      )}
      <Menu>
        <MenuButton className="px-3 py-2 hover:bg-slate-900">
          <div className="px-1">
            <img
              src={profile.image}
              title={profile.name}
              className="size-12 rounded-full"
            />
          </div>
        </MenuButton>
        <MenuItems
          transition
          className="origin-top-right transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          anchor="bottom end"
        >
          <MenuItem>
            <div className="min-w-24 border border-slate-600/80 bg-slate-800 px-4 py-3 hover:bg-slate-700 data-[focus]:bg-slate-700">
              <form action={signOutAction}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          </MenuItem>
        </MenuItems>
      </Menu>
    </header>
  );
}

export default function GuildMenu({
  activeGuild,
  otherGuilds,
}: {
  activeGuild: Guild;
  otherGuilds: Guild[];
}) {
  return (
    <Menu>
      <MenuButton className="hover:bg-slate-900">
        <div className={guildRowItem}>
          <img src={activeGuild.icon} className="size-8 rounded-full" />
          <div>{activeGuild.name}</div>
          <ChevronDown />
        </div>
      </MenuButton>
      <MenuItems
        transition
        className="flex origin-top-right flex-col border border-slate-600/80 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        anchor="bottom end"
      >
        {otherGuilds.map((g) => (
          <MenuItem key={g.id}>
            <Link
              href={`/server/${g.id}`}
              className="bg-slate-800 py-3 hover:bg-slate-700 data-[focus]:bg-slate-700"
              data-guild={g.id}
            >
              <div className={guildRowItem}>
                <img src={g.icon} className="size-8 rounded-full" />
                <div>{g.name}</div>
              </div>
            </Link>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

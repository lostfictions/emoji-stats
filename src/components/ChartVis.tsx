"use client";

import { useMemo } from "react";
import {
  Axis,
  darkTheme,
  GlyphSeries,
  LineSeries,
  XYChart,
} from "@visx/xychart";

import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

import type { EmojiByDate } from "~/app/server/[guild]/page";

/**
 * Object.groupBy() but it returns a Record<K, T[]> instead of a
 * Partial<Record<K, T[]>>. see
 * https://github.com/microsoft/TypeScript/pull/56805#discussion_r1439940587 for
 * details.
 */
function groupBy<K extends PropertyKey, T>(
  ...params: Parameters<typeof Object.groupBy<K, T>>
) {
  return Object.groupBy(...params) as Record<K, T[]>;
}

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ChartVis({ data }: { data: EmojiByDate }) {
  const offsetsForDateAndId = useMemo(() => {
    const o: Record<string, number> = {};
    const byDate = Object.values(groupBy(data, (d) => `${d.day} ${d.count}`));
    for (const group of byDate) {
      for (let i = 0; i < group.length; i++) {
        const e = group[i];
        o[`${e.day} | ${e.id}`] = i + 1;
      }
    }
    return o;
  }, [data]);

  const grouped = useMemo(
    () =>
      Object.entries(
        groupBy(
          data.map((d) => ({
            ...d,
            // convert bigint to number
            count: Number(d.count),
          })),
          (d) => d.id,
        ),
      ),
    [data],
  );

  return (
    <XYChart
      captureEvents={false}
      // complains on the server if it doesn't have fixed width and height
      // but doesn't seem to server render even if they're provided, so...
      // height={400}
      // width={500}
      xScale={{ type: "band" }}
      yScale={{ type: "linear" }}
      theme={darkTheme}
    >
      <Axis orientation="bottom" />
      <Axis orientation="left" />
      {grouped.map(([id, datum]) => (
        <LineSeries
          key={id}
          dataKey={id}
          data={datum}
          xAccessor={(d) => d.day}
          yAccessor={(d) => d.count}
        />
      ))}
      {/* we need to map over grouped a second time to ensure the images are after (ie. on top of) the lines */}
      {grouped.map(([id, datum]) => (
        <GlyphSeries
          key={id}
          dataKey={id}
          data={datum}
          xAccessor={(d) => d.day}
          yAccessor={(d) => d.count}
          renderGlyph={({ datum: e, x, y, color }) => (
            <Tooltip>
              <TooltipTrigger>
                <image
                  x={x - 8 + offsetsForDateAndId[`${e.day} | ${e.id}`] * 18}
                  y={y - 8}
                  className="size-4 object-contain"
                  href={`https://cdn.discordapp.com/emojis/${e.id}.png`}
                />
              </TooltipTrigger>
              <TooltipContent arrowClass="fill-slate-900">
                <div className="flex flex-col items-center gap-1 rounded bg-slate-900 px-4 py-2 text-white">
                  <div className="flex items-center gap-2">
                    <img
                      className="size-4 object-contain"
                      src={`https://cdn.discordapp.com/emojis/${e.id}.png`}
                    />
                    <div style={{ color }}>:{e.name}:</div>
                  </div>
                  <div>
                    Used {e.count} {e.count === 1 ? "time" : "times"} on{" "}
                    {fmt.format(new Date(e.day))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        />
      ))}
    </XYChart>
  );
}

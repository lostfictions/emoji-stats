"use client";

import { useMemo } from "react";
import {
  Axis,
  darkTheme,
  GlyphSeries,
  LineSeries,
  XYChart,
} from "@visx/xychart";
import * as d3 from "d3";

import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

import type { EmojiByDate } from "~/app/server/[guild]/page";
import type { CSSProperties } from "react";

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

// based on https://buildui.com/recipes/responsive-line-chart
export function Chart({ data }: { data: EmojiByDate }) {
  /**
   * multiple emoji might be stacked at the same location (eg. emoji A and emoji
   * B might both have 3 uses on december 15). this calculates a position offset
   * for the glyph to disambiguate them.
   */
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

  // FIXME: be consistent -- memoize or don't, use a single loop if we can...
  const [grouped, minDate, maxDate] = useMemo(
    () =>
      [
        Object.entries(
          groupBy(
            data.map((d) => ({
              ...d,
              day: new Date(d.day),
              // convert bigint to number
              count: Number(d.count),
            })),
            (d) => d.id,
          ),
        ),
        new Date(Math.min(...data.map((d) => new Date(d.day).getTime()))),
        new Date(Math.max(...data.map((d) => new Date(d.day).getTime()))),
      ] as const,
    [data],
  );

  const xScale = d3.scaleUtc().domain([minDate, maxDate]).range([0, 100]);

  const formatXTick = xScale.tickFormat(undefined, "%a %d");

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data.map((d) => Number(d.count))) ?? 0])
    .range([100, 0]);

  const line = d3
    .line<(typeof grouped)[0][1][0]>()
    .x((d) => xScale(d.day))
    .y((d) => yScale(Number(d.count)));

  // FIXME: do these need to be sorted? note "Depending on this line generator’s
  // associated curve, the given input data may need to be sorted by x-value
  // before being passed to the line generator."
  const ds = grouped.map(([id, d]) => [id, line(d)!] as const);

  if (ds.length === 0) {
    return null;
  }

  return (
    <div
      className="@container relative h-full w-full"
      style={
        {
          "--marginTop": "6px",
          "--marginRight": "8px",
          "--marginBottom": "25px",
          "--marginLeft": "25px",
        } as CSSProperties
      }
    >
      {/* X axis */}
      <svg className="absolute inset-0 h-[calc(100%-var(--marginTop))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        {xScale.ticks().map((t, i) => (
          <text
            key={i}
            x={`${xScale(t)}%`}
            y="100%"
            textAnchor={
              i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
            }
            fill="currentColor"
            className="select-none text-sm"
          >
            {formatXTick(t)}
          </text>
        ))}
      </svg>

      {/* Y axis */}
      <svg className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] translate-y-[var(--marginTop)] overflow-visible">
        <g className="translate-x-4">
          {yScale
            .ticks(8)
            .map(yScale.tickFormat(8, "d"))
            .map((value, i) => (
              <text
                key={i}
                y={`${yScale(Number(value))}%`}
                alignmentBaseline="middle"
                textAnchor="end"
                className="text-xs tabular-nums text-gray-600"
                fill="currentColor"
              >
                {value}
              </text>
            ))}
        </g>
      </svg>

      {/* Chart area */}
      <svg className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        <svg
          viewBox="0 0 100 100"
          className="overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {yScale
            .ticks(8)
            .map(yScale.tickFormat(8, "d"))
            .map((active, i) => (
              <g
                transform={`translate(0,${yScale(Number(active))})`}
                className="text-gray-700"
                key={i}
              >
                <line
                  x1={0}
                  x2={100}
                  stroke="currentColor"
                  strokeDasharray="6,5"
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}

          {/* Line */}
          {ds.map(([id, d]) => (
            <path
              key={id}
              d={d}
              fill="none"
              className="text-gray-600"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {data.map((d) => (
            <path
              key={`${d.day} | ${d.id}`}
              d={`M ${xScale(new Date(d.day))} ${yScale(Number(d.count))} l 0.0001 0`}
              vectorEffect="non-scaling-stroke"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              stroke="currentColor"
              className="text-gray-400"
            />
          ))}
        </svg>
      </svg>

      {/* FIXME: bugged? doesn't update on window resize :( */}
      {/* images */}
      <svg className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        {data.map((d) => {
          const key = `${d.day} | ${d.id}`;
          const x = xScale(new Date(d.day));
          const y = yScale(Number(d.count));
          return (
            <image
              key={key}
              className="size-4 object-contain"
              style={
                {
                  x: `calc(${x}% - 8px + ${offsetsForDateAndId[key]}px * 18)`,
                  y: `calc(${y}% - 8px)`,
                } as CSSProperties
              }
              href={`https://cdn.discordapp.com/emojis/${d.id}.png`}
            />
          );
        })}
      </svg>
    </div>
  );
}

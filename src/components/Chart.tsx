import * as d3 from "d3";

import { Tooltip } from "./ChartTooltip";

import type { EmojiByDate } from "~/app/server/[guild]/page";
import type { CSSProperties } from "react";

/**
 * This is `Object.groupBy()`, just typed as Record<K, T[]> instead of
 * Partial<Record<K, T[]>>. see
 * https://github.com/microsoft/TypeScript/pull/56805#discussion_r1439940587
 * for details.
 */
function groupBy<K extends PropertyKey, T>(
  ...params: Parameters<typeof Object.groupBy<K, T>>
) {
  return Object.groupBy(...params) as Record<K, T[]>;
}

// based on https://buildui.com/recipes/responsive-line-chart
export function Chart({ data }: { data: EmojiByDate }) {
  /**
   * multiple emoji might be stacked at the same location (eg. emoji A and emoji
   * B might both have 3 uses on december 15). this calculates a position offset
   * for the glyph to disambiguate them.
   */
  const offsetsForDateAndId = (() => {
    const o: Record<string, number> = {};
    const byDate = Object.values(groupBy(data, (d) => `${d.day} ${d.count}`));
    for (const group of byDate) {
      for (let i = 0; i < group.length; i++) {
        const e = group[i];
        o[`${e.day} | ${e.id}`] = i + 1;
      }
    }
    return o;
  })();

  const grouped = Object.entries(
    groupBy(
      data.map((d) => ({
        ...d,
        day: new Date(d.day),
        // convert bigint to number
        count: Number(d.count),
      })),
      (d) => d.id,
    ),
  );
  const minDate = new Date(
    Math.min(...data.map((d) => new Date(d.day).getTime())),
  );
  const maxDate = new Date(
    Math.max(...data.map((d) => new Date(d.day).getTime())),
  );

  const colorScale = d3.scaleOrdinal().range(d3.schemeSet3);

  const xScale = d3.scaleUtc().domain([minDate, maxDate]).range([10, 90]);

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
        {/* FIXME: count number of ticks? */}
        {xScale.ticks(4).map((t, i) => (
          <text
            key={i}
            x={`${xScale(t)}%`}
            y="100%"
            textAnchor="middle"
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
            .ticks(20)
            .map(yScale.tickFormat(8, "d"))
            .map((value, i) => (
              <text
                key={i}
                y={`${yScale(Number(value))}%`}
                alignmentBaseline="middle"
                textAnchor="end"
                className="select-none text-xs tabular-nums text-gray-600"
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
            .ticks(20)
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
              stroke={colorScale(id) as string}
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
              stroke={colorScale(d.id) as string}
            />
          ))}
        </svg>
      </svg>

      {/* images */}
      <svg className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        {data.map((d) => (
          <Tooltip
            key={`${d.day} | ${d.id}`}
            d={d}
            color={String(colorScale(d.id))}
          >
            <image
              x={`${xScale(new Date(d.day))}%`}
              y={`${yScale(Number(d.count))}%`}
              style={
                {
                  "--offset": offsetsForDateAndId[`${d.day} | ${d.id}`],
                } as CSSProperties
              }
              className="size-4 -translate-y-2 translate-x-[calc(var(--offset)*18px-8px)] object-contain"
              href={`https://cdn.discordapp.com/emojis/${d.id}.png`}
            />
          </Tooltip>
        ))}
      </svg>
    </div>
  );
}

import * as d3 from "d3";
import { Fragment, type CSSProperties } from "react";
import { differenceInDays } from "date-fns";

import { Tooltip } from "./ChartTooltip";

import type { EmojiByDate } from "~/app/server/[guild]/page";

// based on https://buildui.com/recipes/responsive-line-chart
export function Chart({ data }: { data: EmojiByDate }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl">
        nothing to show! use some reacts.....
      </div>
    );
  }

  const minDate = new Date(
    Math.min(...data.map((d) => new Date(d.day).getTime())),
  );
  const maxDate = new Date(
    Math.max(...data.map((d) => new Date(d.day).getTime())),
  );

  const colorScale = d3.scaleOrdinal().range(d3.schemeSet3);

  const series = d3
    .stack<[string, d3.InternMap<string, EmojiByDate[0]>]>()
    .keys([...new Set(data.map((d) => d.name))])
    .value(([, group], key) => Number(group.get(key)?.count ?? 0))
    .order(d3.stackOrderDescending)(
    // @ts-expect-error pooping your pants constantly: the d3 story
    d3.index(
      data,
      (d) => d.day,
      (d) => d.name,
    ),
  );

  const xScale = d3.scaleUtc().domain([minDate, maxDate]).range([10, 90]);

  const yScale = d3
    .scaleLinear()
    // @ts-expect-error sob
    .domain([0, d3.max(series, (d) => d3.max(d, (p) => p[1]))])
    .nice()
    .range([100, 0]);

  const fmtWithMonth = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const fmtDayOfWeek = new Intl.DateTimeFormat("en-US", {
    weekday: "narrow",
  });

  const formatXTick = (date: Date) =>
    date.getDate() === 1 || date.toDateString() === minDate.toDateString()
      ? fmtWithMonth.format(date)
      : String(date.getDate());

  const dateCount = differenceInDays(maxDate, minDate);
  const colWidth = Math.min(100 / dateCount - 2, 5);
  console.log("colWidth", colWidth);

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
        {xScale.ticks(dateCount).map((t, i) => (
          <Fragment key={i}>
            <text
              x={`${xScale(t)}%`}
              y="98.8%"
              textAnchor="middle"
              fill="currentColor"
              className="select-none text-sm"
            >
              {formatXTick(t)}
            </text>
            <text
              x={`${xScale(t)}%`}
              y="99.5%"
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="currentColor"
              opacity="0.5"
              className="select-none text-xs"
            >
              {fmtDayOfWeek.format(t)}
            </text>
          </Fragment>
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

          {series.flatMap((s) =>
            s.map((p) => {
              const [low, high] = p;
              const {
                data: [date, map],
              } = p;

              const d = map.get(s.key)!;

              const x = xScale(new Date(date));

              if (low === high) return null;

              return (
                <Tooltip
                  key={`${d.day} | ${d.id}`}
                  d={d}
                  color={String(colorScale(d.id))}
                >
                  <rect
                    fill={colorScale(d.id) as string}
                    x={x - colWidth / 2}
                    width={colWidth}
                    y={yScale(high)}
                    height={yScale(low) - yScale(high)}
                  />
                </Tooltip>
              );
            }),
          )}
        </svg>
      </svg>

      {/* images */}
      <svg className="pointer-events-none absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        {series.flatMap((s) =>
          s.map((p) => {
            const [low, high] = p;
            const {
              data: [, map],
            } = p;

            const d = map.get(s.key)!;

            // TODO: calculate definite height based on chart size
            const proportion = yScale(low) - yScale(high);

            if (low === high || proportion < 4) return null;

            return (
              <image
                key={`${d.day} | ${d.id}`}
                opacity={0.8}
                x={`${xScale(new Date(d.day))}%`}
                y={`${yScale((high + low) / 2)}%`}
                className="size-4 -translate-x-2 -translate-y-2 object-contain"
                href={`https://cdn.discordapp.com/emojis/${d.id}.png`}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

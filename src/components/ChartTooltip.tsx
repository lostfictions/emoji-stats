"use client";

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";

import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingArrow,
  type ReferenceType,
} from "@floating-ui/react";

import type { EmojiByDate } from "~/app/server/[guild]/page";

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function useTooltip() {
  const [open, setOpen] = useState(false);

  const arrowRef = useRef<SVGSVGElement>(null);

  const data = useFloating({
    placement: "top",
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: "start", padding: 5 }),
      shift({ padding: 5 }),
      arrow({ element: arrowRef }),
    ],
  });

  const { context } = data;

  const hover = useHover(context, { move: false, enabled: true });
  const focus = useFocus(context, { enabled: true });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({ open, setOpen, arrowRef, ...interactions, ...data }),
    [open, setOpen, interactions, data],
  );
}

export function Tooltip({
  children,
  d,
  color,
}: {
  children: ReactNode;
  d: EmojiByDate[0];
  color: string;
}) {
  const tooltip = useTooltip();

  const wrapperRef = useRef<SVGGElement>(null);

  useEffect(() => {
    tooltip.refs.setReference(
      (wrapperRef.current?.firstChild as ReferenceType) ?? null,
    );
  }, [tooltip.refs]);

  return (
    <>
      <g ref={wrapperRef}>{children}</g>
      {tooltip.open ? (
        <FloatingPortal>
          <div
            ref={tooltip.refs.setFloating}
            style={tooltip.floatingStyles}
            {...tooltip.getFloatingProps()}
          >
            <div className="flex flex-col items-center gap-1 rounded bg-slate-900 px-4 py-2 text-white">
              <div className="flex items-center gap-2">
                <img
                  className="size-4 object-contain"
                  src={`https://cdn.discordapp.com/emojis/${d.id}.png`}
                />
                <div style={{ color }}>:{d.name}:</div>
              </div>
              <div>
                Used {d.count} {d.count === 1n ? "time" : "times"} on{" "}
                {fmt.format(new Date(d.day))}
              </div>
            </div>
            <FloatingArrow
              ref={tooltip.arrowRef}
              context={tooltip.context}
              className="fill-slate-900"
            />
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

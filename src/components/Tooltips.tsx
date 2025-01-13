"use client";

import { useState, useMemo, useRef, type ReactNode, useEffect } from "react";

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
  type Placement,
  type ReferenceType,
} from "@floating-ui/react";

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

type NodeType = SVGImageElement;

interface TooltipOptions {
  placement?: Placement;
}

function useTooltip({ placement = "top" }: TooltipOptions = {}) {
  const [open, setOpen] = useState(false);

  const arrowRef = useRef<SVGSVGElement>(null);

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "start",
        padding: 5,
      }),
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

export function Tooltips({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [images, setImages] = useState<NodeType[] | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) {
      setImages(null);
    } else {
      const tmp = [
        ...wrapperRef.current.querySelectorAll<NodeType>("image[data-tooltip]"),
      ];

      console.log(`got ${tmp.length} results`);
      setImages(tmp);
    }
  }, [setImages]);

  return (
    <div ref={wrapperRef} className="contents">
      {children}
      {images?.map((img, i) => {
        const [name, id, day, count, color] =
          img.dataset["tooltip"]!.split("|");

        return (
          <Tooltip key={i} refEl={img} arrowClass="fill-slate-900">
            <div className="flex flex-col items-center gap-1 rounded bg-slate-900 px-4 py-2 text-white">
              <div className="flex items-center gap-2">
                <img
                  className="size-4 object-contain"
                  src={`https://cdn.discordapp.com/emojis/${id}.png`}
                />
                <div style={{ color }}>:{name}:</div>
              </div>
              <div>
                Used {count} {count === "1" ? "time" : "times"} on{" "}
                {fmt.format(new Date(day))}
              </div>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

function Tooltip({
  refEl,
  children,
  arrowClass,
}: {
  refEl: ReferenceType;
  children: ReactNode;
  arrowClass?: string;
}) {
  const tooltip = useTooltip();

  useEffect(() => {
    tooltip.refs.setReference(refEl);
    return () => tooltip.refs.setReference(null);
  }, [refEl, tooltip.refs]);

  if (!tooltip.open) return null;

  return (
    <FloatingPortal>
      <div
        ref={tooltip.refs.setFloating}
        style={tooltip.floatingStyles}
        {...tooltip.getFloatingProps()}
      >
        {children}
        <FloatingArrow
          ref={tooltip.arrowRef}
          context={tooltip.context}
          className={arrowClass}
        />
      </div>
    </FloatingPortal>
  );
}

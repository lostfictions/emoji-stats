// copied wholesale from
// https://floating-ui.com/docs/tooltip#reusable-tooltip-component
// and adjusted to add arrow tail
import {
  useState,
  useMemo,
  useRef,
  createContext,
  useContext,
  isValidElement,
  cloneElement,
  type ReactNode,
  type HTMLProps,
  type RefObject,
} from "react";

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
  useMergeRefs,
  FloatingPortal,
  FloatingArrow,
  type Placement,
} from "@floating-ui/react";

interface TooltipOptions {
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function useTooltip({
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TooltipOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);

  const arrowRef = useRef<SVGSVGElement>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
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

  const hover = useHover(context, {
    move: false,
    enabled: controlledOpen == null,
  });
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      arrowRef,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
}

type ContextType = ReturnType<typeof useTooltip> | null;

const TooltipContext = createContext<ContextType>(null);

const useTooltipContext = () => {
  const context = useContext(TooltipContext);

  if (context == null) {
    throw new Error("Tooltip components must be wrapped in <Tooltip />");
  }

  return context;
};

export function Tooltip({
  children,
  ...options
}: { children: ReactNode } & TooltipOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const tooltip = useTooltip(options);
  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild = false,
  ref: propRef,
  ...props
}: HTMLProps<HTMLElement> & {
  asChild?: boolean;
  ref?: RefObject<HTMLElement>;
}) {
  const context = useTooltipContext();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const childrenRef = (children as any).ref;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      context.getReferenceProps({
        ref,
        ...props,
        // @ts-expect-error no idea chief
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      }),
    );
  }

  return (
    <button
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? "open" : "closed"}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
}

export function TooltipContent({
  arrowClass,
  children,
}: {
  arrowClass?: string;
  children: ReactNode;
}) {
  const context = useTooltipContext();

  if (!context.open) return null;

  return (
    <FloatingPortal>
      <div
        ref={context.refs.setFloating}
        style={context.floatingStyles}
        {...context.getFloatingProps()}
      >
        {children}
        <FloatingArrow
          ref={context.arrowRef}
          context={context.context}
          className={arrowClass}
        />
      </div>
    </FloatingPortal>
  );
}

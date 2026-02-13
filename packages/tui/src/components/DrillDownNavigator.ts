/**
 * DrillDownNavigator Component
 *
 * Stack-based navigation for drilling into nested views.
 * Supports back navigation with Esc or Left Arrow.
 */

import { createSignal, type Accessor, type JSX } from "solid-js";

/**
 * Navigation API passed to children
 */
export interface NavigatorApi {
  /** Push a new view onto the stack */
  push: (view: () => JSX.Element) => void;
  /** Pop the current view and go back */
  pop: () => void;
  /** Replace the current view */
  replace: (view: () => JSX.Element) => void;
  /** Go back to the root view */
  reset: () => void;
  /** Current stack depth */
  depth: Accessor<number>;
  /** Whether we can go back */
  canGoBack: Accessor<boolean>;
}

/**
 * Props for DrillDownNavigator
 */
export interface DrillDownNavigatorProps {
  /** Render function receiving navigator API */
  children: (nav: NavigatorApi) => JSX.Element;
  /** Called when navigation stack changes */
  onNavigate?: (depth: number) => void;
}

/**
 * DrillDownNavigator - Stack-based drill-down navigation
 *
 * @example
 * ```tsx
 * <DrillDownNavigator>
 *   {(nav) => (
 *     <FileList
 *       onSelect={(file) => nav.push(() => <TraceList file={file} />)}
 *     />
 *   )}
 * </DrillDownNavigator>
 * ```
 */
export function DrillDownNavigator(props: DrillDownNavigatorProps): JSX.Element {
  const [stack, setStack] = createSignal<Array<() => JSX.Element>>([]);

  const push = (view: () => JSX.Element) => {
    setStack((prev) => [...prev, view]);
    props.onNavigate?.(stack().length + 1);
  };

  const pop = () => {
    if (stack().length > 0) {
      setStack((prev) => prev.slice(0, -1));
      props.onNavigate?.(stack().length - 1);
    }
  };

  const replace = (view: () => JSX.Element) => {
    if (stack().length > 0) {
      setStack((prev) => [...prev.slice(0, -1), view]);
    } else {
      push(view);
    }
  };

  const reset = () => {
    setStack([]);
    props.onNavigate?.(0);
  };

  const depth = () => stack().length;
  const canGoBack = () => stack().length > 0;

  const api: NavigatorApi = {
    push,
    pop,
    replace,
    reset,
    depth,
    canGoBack,
  };

  // Render the current view (top of stack) or the initial children
  const currentView = (): JSX.Element => {
    const currentStack = stack();
    if (currentStack.length > 0) {
      return currentStack[currentStack.length - 1]();
    }
    return props.children(api);
  };

  // Wrap with key handler for back navigation
  return {
    type: "box",
    props: {
      width: "100%",
      height: "100%",
      onKeyDown: (event: { key: string; defaultPrevented?: boolean }) => {
        if (event.defaultPrevented) return;

        // Escape or Left Arrow to go back
        if ((event.key === "Escape" || event.key === "ArrowLeft") && canGoBack()) {
          pop();
        }
      },
    },
    children: currentView(),
  } as unknown as JSX.Element;
}

export default DrillDownNavigator;

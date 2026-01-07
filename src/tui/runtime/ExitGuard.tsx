import { onCleanup } from "solid-js";
import type { CliRenderer } from "@opentui/core";
import type { JSX } from "@opentui/solid";
import { useRenderer } from "@opentui/solid";

export interface ExitGuardProps {
  children: JSX.Element;
}

type ExitGuardState = {
  originalExit: typeof process.exit;
  renderers: Set<CliRenderer>;
  activeCount: number;
  isExiting: boolean;
};

const EXIT_GUARD_STATE_KEY = Symbol.for(
  "@alcyone-labs/arg-parser/tui/ExitGuardState",
);

function getExitGuardState(): ExitGuardState | undefined {
  return (process as any)[EXIT_GUARD_STATE_KEY] as ExitGuardState | undefined;
}

function setExitGuardState(state: ExitGuardState | undefined): void {
  if (state) {
    (process as any)[EXIT_GUARD_STATE_KEY] = state;
  } else {
    delete (process as any)[EXIT_GUARD_STATE_KEY];
  }
}

export function ExitGuard(props: ExitGuardProps): JSX.Element {
  const renderer = useRenderer();

  let state = getExitGuardState();

  if (!state) {
    const originalExit = process.exit.bind(process) as typeof process.exit;

    state = {
      originalExit,
      renderers: new Set<CliRenderer>(),
      activeCount: 0,
      isExiting: false,
    };

    setExitGuardState(state);

    const guardedExit = ((code?: number): never => {
      const currentState = getExitGuardState();
      if (!currentState) {
        return originalExit(code);
      }

      if (currentState.isExiting) {
        return currentState.originalExit(code);
      }

      currentState.isExiting = true;
      try {
        if (typeof code === "number") {
          process.exitCode = code;
        }

        for (const r of currentState.renderers) {
          try {
            r.destroy();
          } catch {
            // Ignore destroy errors during shutdown
          }
        }
      } finally {
        return currentState.originalExit(code);
      }
    }) as typeof process.exit;

    process.exit = guardedExit;
  }

  state.activeCount++;
  state.renderers.add(renderer);

  onCleanup(() => {
    const state = getExitGuardState();
    if (!state) {
      return;
    }

    state.renderers.delete(renderer);
    state.activeCount = Math.max(0, state.activeCount - 1);

    if (state.activeCount === 0) {
      process.exit = state.originalExit;
      setExitGuardState(undefined);
    }
  });

  return props.children;
}

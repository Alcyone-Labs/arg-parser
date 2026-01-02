/**
 * TUI Toast Notification System
 *
 * Provides a simple overlay toast notification that fades in/out
 * for quick feedback messages like "Copied!", "Saved", etc.
 */

import {
  createSignal,
  createContext,
  useContext,
  type Accessor,
} from "solid-js";
import type { JSX } from "@opentui/solid";
import { createComponent } from "@opentui/solid";
import type { ToastType } from "./types";

export type { ToastType };


/**
 * Internal toast state
 */
interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

/**
 * Toast context value interface
 */
export interface ToastContextValue {
  /** Show an info toast */
  info: (message: string, duration?: number) => void;
  /** Show a success toast */
  success: (message: string, duration?: number) => void;
  /** Show an error toast */
  error: (message: string, duration?: number) => void;
  /** Show a warning toast */
  warning: (message: string, duration?: number) => void;
  /** Current toast state */
  state: Accessor<ToastState>;
  /** Hide the current toast */
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue>();

const DEFAULT_DURATION = 3000; // 3 seconds

/**
 * Toast provider component
 *
 * Wraps your application to provide toast notification functionality.
 */
export function ToastProvider(props: { children: JSX.Element }): JSX.Element {
  const [state, setState] = createSignal<ToastState>({
    message: "",
    type: "info",
    visible: false,
  });

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const show = (message: string, type: ToastType, duration: number) => {
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Show the toast
    setState({ message, type, visible: true });

    // Auto-hide after duration
    hideTimeout = setTimeout(() => {
      setState(prev => ({ ...prev, visible: false }));
    }, duration);
  };

  const hide = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    setState(prev => ({ ...prev, visible: false }));
  };

  const value: ToastContextValue = {
    info: (message, duration = DEFAULT_DURATION) => show(message, "info", duration),
    success: (message, duration = DEFAULT_DURATION) => show(message, "success", duration),
    error: (message, duration = DEFAULT_DURATION) => show(message, "error", duration),
    warning: (message, duration = DEFAULT_DURATION) => show(message, "warning", duration),
    state,
    hide,
  };

  return createComponent(ToastContext.Provider, {
    value,
    get children() {
      return props.children;
    },
  });
}

/**
 * Hook to access the toast context
 *
 * @returns Toast context value with show methods
 * @throws Error if used outside ToastProvider
 *
 * @example
 * ```tsx
 * function CopyButton() {
 *   const toast = useToast()
 *
 *   const handleCopy = async () => {
 *     await navigator.clipboard.writeText("Hello!")
 *     toast.success("Copied to clipboard!")
 *   }
 *
 *   return (
 *     <button onMouseDown={handleCopy}>
 *       Copy
 *     </button>
 *   )
 * }
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * Get the color for a toast type based on common theme conventions
 */
export function getToastColor(type: ToastType): string {
  switch (type) {
    case "success":
      return "#00ff88";
    case "error":
      return "#ff4444";
    case "warning":
      return "#ffaa00";
    case "info":
    default:
      return "#00d4ff";
  }
}

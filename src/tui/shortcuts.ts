/**
 * TUI Shortcut System
 *
 * Provides keyboard shortcut handling with support for:
 * - Simple shortcuts: "ctrl+t", "escape"
 * - Chord sequences: "ctrl+x t" (press Ctrl+X, then t)
 */

import {
  createSignal,
  createContext,
  useContext,
  type Accessor,
} from "solid-js";
import type { JSX } from "@opentui/solid";
import { createComponent } from "@opentui/solid";
import type { ShortcutBinding } from "./types";

export type { ShortcutBinding };


/**
 * Shortcut context value interface
 */
export interface ShortcutContextValue {
  /** Register a shortcut binding, returns cleanup function */
  register: (binding: ShortcutBinding) => () => void;
  /** Currently pending chord prefix (null if not in chord mode) */
  pending: Accessor<string | null>;
  /** Get all registered bindings */
  bindings: Accessor<ShortcutBinding[]>;
}

const ShortcutContext = createContext<ShortcutContextValue>();

/**
 * Parse a key string into normalized form
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .split("+")
    .sort((a, b) => {
      // Sort modifiers first: ctrl, alt, shift, then the key
      const order = ["ctrl", "alt", "shift"];
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    })
    .join("+");
}

/**
 * Check if a key event matches a key pattern
 */
function matchesKey(event: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }, pattern: string): boolean {
  const normalized = normalizeKey(pattern);
  const parts = normalized.split("+");
  
  const key = parts.filter(p => !["ctrl", "alt", "shift"].includes(p))[0];
  const needsCtrl = parts.includes("ctrl");
  const needsAlt = parts.includes("alt");
  const needsShift = parts.includes("shift");

  // Check modifiers
  if (needsCtrl && !event.ctrl) return false;
  if (needsAlt && !event.alt) return false;
  if (needsShift && !event.shift) return false;

  // Check key (case-insensitive)
  return event.key.toLowerCase() === key;
}

/**
 * Shortcut provider component
 */
export function ShortcutProvider(props: {
  bindings?: ShortcutBinding[];
  children: JSX.Element;
}): JSX.Element {
  const [registeredBindings, setRegisteredBindings] = createSignal<ShortcutBinding[]>(
    props.bindings ?? []
  );
  const [pending, setPending] = createSignal<string | null>(null);
  let chordTimeout: ReturnType<typeof setTimeout> | null = null;

  const register = (binding: ShortcutBinding): (() => void) => {
    setRegisteredBindings(prev => [...prev, binding]);
    return () => {
      setRegisteredBindings(prev => prev.filter(b => b !== binding));
    };
  };
  // Exposed for testing or external integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleKeyEvent = (event: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }) => {
    const bindings = registeredBindings();
    const currentPending = pending();

    // Clear chord timeout on any key
    if (chordTimeout) {
      clearTimeout(chordTimeout);
      chordTimeout = null;
    }

    // If we have a pending chord, look for the second part
    if (currentPending) {
      const fullChord = `${currentPending} ${event.key.toLowerCase()}`;
      const matchedBinding = bindings.find(b => {
        const parts = b.key.toLowerCase().split(" ");
        return parts.length === 2 && parts.join(" ") === fullChord;
      });

      if (matchedBinding) {
        setPending(null);
        matchedBinding.action();
        return;
      }

      // No match, clear pending
      setPending(null);
    }

    // Check for simple shortcuts or chord starters
    for (const binding of bindings) {
      const parts = binding.key.toLowerCase().split(" ");

      if (parts.length === 1) {
        // Simple shortcut
        if (matchesKey(event, parts[0])) {
          binding.action();
          return;
        }
      } else if (parts.length === 2) {
        // Chord starter
        if (matchesKey(event, parts[0])) {
          setPending(parts[0]);
          // Auto-cancel chord after 2 seconds
          chordTimeout = setTimeout(() => {
            setPending(null);
          }, 2000);
          return;
        }
      }
    }
  };

  // Note: OpenTUI handles global key events via the renderer
  // This context provides the registration API for components

  const value: ShortcutContextValue = {
    register,
    pending,
    bindings: registeredBindings,
  };

  return createComponent(ShortcutContext.Provider, {
    value,
    get children() {
      return props.children;
    },
  });
}

/**
 * Hook to access the shortcut context
 *
 * @returns Shortcut context value
 * @throws Error if used outside ShortcutProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { register, pending } = useShortcuts()
 *
 *   // Register a shortcut on mount
 *   onMount(() => {
 *     const cleanup = register({
 *       key: "ctrl+s",
 *       action: () => save(),
 *       description: "Save file"
 *     })
 *     onCleanup(cleanup)
 *   })
 *
 *   return (
 *     <text>
 *       {pending() ? `Waiting for chord: ${pending()}...` : "Ready"}
 *     </text>
 *   )
 * }
 * ```
 */
export function useShortcuts(): ShortcutContextValue {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error("useShortcuts must be used within a ShortcutProvider");
  }
  return context;
}

/**
 * Virtual Scroll Hook
 *
 * Manages a virtualized list with a fixed viewport height.
 */

import { createMemo, createSignal, type Accessor } from "solid-js";

export interface VirtualScrollResult<T> {
  /** Items currently visible in the viewport */
  visibleItems: Accessor<Array<{ item: T; globalIndex: number }>>;
  /** Current scroll offset (first visible item index) */
  scrollOffset: Accessor<number>;
  /** Adjust scroll to keep the given index visible */
  adjustScroll: (idx: number) => void;
  /** Scroll by a delta (for mouse wheel) */
  scrollBy: (delta: number) => void;
}

/**
 * Create a virtual scroll controller for a list.
 *
 * @param items - Accessor returning the full list of items
 * @param selectedIdx - Accessor returning the currently selected index
 * @param viewportHeight - Accessor returning the viewport height in rows
 * @returns VirtualScrollResult with visible items and scroll controls
 *
 * @example
 * ```tsx
 * const scroll = useVirtualScroll(
 *   () => myItems,
 *   selectedIdx,
 *   () => Math.max(10, process.stdout.rows - 8)
 * );
 *
 * <For each={scroll.visibleItems()}>
 *   {({ item, globalIndex }) => ...}
 * </For>
 * ```
 */
export function useVirtualScroll<T>(
  items: Accessor<T[]>,
  _selectedIdx: Accessor<number>,
  viewportHeight: Accessor<number>,
): VirtualScrollResult<T> {
  const [scrollOffset, setScrollOffset] = createSignal(0);

  const adjustScroll = (newIdx: number) => {
    const vh = viewportHeight();
    const currentOffset = scrollOffset();
    if (newIdx < currentOffset) {
      setScrollOffset(newIdx);
    } else if (newIdx >= currentOffset + vh) {
      setScrollOffset(newIdx - vh + 1);
    }
  };

  const visibleItems = createMemo(() => {
    const allItems = items();
    const vh = viewportHeight();
    const start = scrollOffset();
    const end = Math.min(start + vh, allItems.length);
    return allItems.slice(start, end).map((item, localIdx) => ({
      item,
      globalIndex: start + localIdx,
    }));
  });

  const scrollBy = (delta: number) => {
    const maxOffset = Math.max(0, items().length - viewportHeight());
    setScrollOffset((o) => Math.max(0, Math.min(maxOffset, o + delta)));
  };

  return { visibleItems, adjustScroll, scrollOffset, scrollBy };
}

/**
 * Get dynamic viewport height based on terminal size.
 *
 * @param reservedRows - Number of rows reserved for header/footer/etc (default: 8)
 * @param minHeight - Minimum viewport height (default: 10)
 */
export function getViewportHeight(reservedRows = 8, minHeight = 10): number {
  return Math.max(minHeight, (process.stdout.rows || 24) - reservedRows);
}

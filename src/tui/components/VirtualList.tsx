/**
 * Virtual List Component
 * 
 * Renders a scrollable list with virtual rendering for performance.
 * Integrates with the framework's scroll and theme systems.
 */

import type { JSX, Accessor } from "@opentui/solid";
import { createSignal, createMemo, For, Show } from "solid-js";
import { useTheme } from "../themes";

// ============================================================================
// Types
// ============================================================================

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[] | Accessor<T[]>;
  /** Currently selected index */
  selectedIndex: number | Accessor<number>;
  /** Callback when selection changes */
  onSelect?: (index: number) => void;
  /** Viewport height in rows (if not using TuiProvider) */
  viewportHeight?: number | Accessor<number>;
  /** Title to display above the list */
  title?: string;
  /** Custom item renderer */
  renderItem?: (item: T, index: number, selected: boolean) => JSX.Element;
  /** Get label from item (used by default renderer) */
  getLabel?: (item: T) => string;
  /** Show selection indicator */
  showIndicator?: boolean;
}

export interface VirtualListResult {
  /** Current scroll offset */
  scrollOffset: Accessor<number>;
  /** Adjust scroll to keep index visible */
  adjustScroll: (idx: number) => void;
  /** Scroll by delta */
  scrollBy: (delta: number) => void;
  /** Move selection up */
  selectPrevious: () => void;
  /** Move selection down */
  selectNext: () => void;
}

// ============================================================================
// Helper to unwrap accessor or value
// ============================================================================

function unwrap<T>(value: T | Accessor<T>): T {
  return typeof value === "function" ? (value as Accessor<T>)() : value;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Virtual List component with built-in scrolling.
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={items}
 *   selectedIndex={selectedIdx()}
 *   onSelect={setSelectedIdx}
 *   getLabel={(item) => item.name}
 *   title="Items"
 * />
 * ```
 */
export function VirtualList<T>(props: VirtualListProps<T>): JSX.Element {
  const { current: theme } = useTheme();
  const [scrollOffset, setScrollOffset] = createSignal(0);

  // Unwrap reactive props
  const items = () => unwrap(props.items);
  const selectedIndex = () => unwrap(props.selectedIndex);
  const viewportHeight = () => unwrap(props.viewportHeight ?? 20);
  const showIndicator = props.showIndicator ?? true;

  // Adjust scroll to keep selection visible
  const adjustScroll = (newIdx: number) => {
    const vh = viewportHeight();
    const currentOffset = scrollOffset();
    if (newIdx < currentOffset) {
      setScrollOffset(newIdx);
    } else if (newIdx >= currentOffset + vh) {
      setScrollOffset(newIdx - vh + 1);
    }
  };

  // Scroll by delta
  const scrollBy = (delta: number) => {
    const maxOffset = Math.max(0, items().length - viewportHeight());
    setScrollOffset((o) => Math.max(0, Math.min(maxOffset, o + delta)));
  };

  // Navigation helpers
  const selectPrevious = () => {
    if (props.onSelect) {
      const newIdx = Math.max(0, selectedIndex() - 1);
      props.onSelect(newIdx);
      adjustScroll(newIdx);
    }
  };

  const selectNext = () => {
    if (props.onSelect) {
      const newIdx = Math.min(items().length - 1, selectedIndex() + 1);
      props.onSelect(newIdx);
      adjustScroll(newIdx);
    }
  };

  // Visible items slice
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

  // Default item renderer
  const defaultRenderItem = (item: T, index: number, selected: boolean) => {
    const label = props.getLabel ? props.getLabel(item) : String(item);
    const t = theme();
    return (
      <box height={1} backgroundColor={selected ? t.colors.selection : undefined}>
        <text color={selected ? t.colors.background : t.colors.text}>
          {showIndicator ? (selected ? "› " : "  ") : ""}{label}
        </text>
      </box>
    );
  };

  const renderItem = props.renderItem ?? defaultRenderItem;

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show when={props.title}>
        <text bold color={theme().colors.text} marginBottom={1}>
          {props.title} ({selectedIndex() + 1}/{items().length})
        </text>
      </Show>
      <For each={visibleItems()}>
        {({ item, globalIndex }) => 
          renderItem(item, globalIndex, globalIndex === selectedIndex())
        }
      </For>
    </box>
  );
}

/**
 * Hook to create a VirtualList controller for external navigation.
 */
export function createVirtualListController<T>(
  items: Accessor<T[]>,
  selectedIndex: Accessor<number>,
  setSelectedIndex: (idx: number) => void,
  viewportHeight: Accessor<number>
): VirtualListResult {
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

  const scrollBy = (delta: number) => {
    const maxOffset = Math.max(0, items().length - viewportHeight());
    setScrollOffset((o) => Math.max(0, Math.min(maxOffset, o + delta)));
  };

  const selectPrevious = () => {
    const newIdx = Math.max(0, selectedIndex() - 1);
    setSelectedIndex(newIdx);
    adjustScroll(newIdx);
  };

  const selectNext = () => {
    const newIdx = Math.min(items().length - 1, selectedIndex() + 1);
    setSelectedIndex(newIdx);
    adjustScroll(newIdx);
  };

  return { scrollOffset, adjustScroll, scrollBy, selectPrevious, selectNext };
}

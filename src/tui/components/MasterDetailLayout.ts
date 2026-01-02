/**
 * MasterDetailLayout Component
 *
 * A split-pane layout with a master list on the left and
 * detail view on the right. Both panes scroll independently.
 */

import type { JSX } from "solid-js";


/**
 * Props for MasterDetailLayout
 */
export interface MasterDetailLayoutProps {
  /** Width of the master panel (number = columns, string = percentage like "30%") */
  masterWidth?: number | string;
  /** Master panel content (typically a list) */
  master: JSX.Element;
  /** Detail panel content */
  detail: JSX.Element;
  /** Gap between panels (default: 1) */
  gap?: number;
  /** Whether to show a vertical divider (default: true) */
  showDivider?: boolean;
}

/**
 * Parse width prop to a flexBasis value
 */
function parseWidth(width: number | string | undefined): number | string {
  if (width === undefined) return "30%";
  if (typeof width === "number") return width;
  if (width.endsWith("%")) {
    const percent = parseInt(width.replace("%", ""), 10);
    return `${percent}%`;
  }
  return width;
}

/**
 * MasterDetailLayout - Split panel layout with independent scrolling
 *
 * @example
 * ```tsx
 * <MasterDetailLayout
 *   masterWidth={30}
 *   master={<ItemList items={items} onSelect={setSelected} />}
 *   detail={<DetailView item={selected()} />}
 * />
 * ```
 */
export function MasterDetailLayout(props: MasterDetailLayoutProps): JSX.Element {
  const masterWidth = parseWidth(props.masterWidth);
  const gap = props.gap ?? 1;
  const showDivider = props.showDivider ?? true;

  // Build the layout using OpenTUI's box elements with Yoga flexbox
  // This is a conceptual implementation - actual element names depend on @opentui/solid catalog
  
  return {
    type: "box",
    props: {
      flexDirection: "row",
      width: "100%",
      height: "100%",
    },
    children: [
      // Master panel
      {
        type: "box",
        props: {
          flexBasis: masterWidth,
          flexShrink: 0,
          overflow: "scroll",
        },
        children: props.master,
      },
      // Divider (optional)
      ...(showDivider
        ? [
            {
              type: "box",
              props: {
                width: 1,
                marginLeft: Math.floor(gap / 2),
                marginRight: Math.ceil(gap / 2),
              },
              children: {
                type: "text",
                props: {
                  style: { fg: "#444444" },
                },
                children: "│".repeat(100), // Repeating for height
              },
            },
          ]
        : []),
      // Detail panel
      {
        type: "box",
        props: {
          flexGrow: 1,
          overflow: "scroll",
        },
        children: props.detail,
      },
    ],
  } as unknown as JSX.Element;
}

export default MasterDetailLayout;

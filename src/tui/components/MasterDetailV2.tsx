/**
 * Master Detail Layout Component
 *
 * A slot-based layout with:
 * - Header with title
 * - Breadcrumb navigation
 * - Left master panel (for list)
 * - Right detail panel (slot-based custom content)
 * - Footer with shortcuts
 */

import { Show } from "solid-js";
import type { JSX } from "@opentui/solid";
import { useTheme } from "../themes";
import { Breadcrumb } from "./Breadcrumb";

// ============================================================================
// Types
// ============================================================================

export interface MasterDetailProps {
  /** Header title */
  header: string;
  /** Breadcrumb segments (optional) */
  breadcrumb?: string[];
  /** Footer text (shortcuts hint) */
  footer?: string;
  /** Master panel content (left side - typically VirtualList) */
  master: JSX.Element;
  /** Detail panel content (right side - custom slot) */
  detail: JSX.Element;
  /** Master panel width (default: "35%") */
  masterWidth?: string;
  /** Header icon emoji (optional) */
  headerIcon?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Master-Detail layout with slot-based panels.
 *
 * @example
 * ```tsx
 * <MasterDetail
 *   header="My App"
 *   headerIcon="📋"
 *   breadcrumb={["Items", selectedItem().name]}
 *   footer="↑↓: Navigate | Enter: Select | q: Quit"
 *   master={
 *     <VirtualList
 *       items={items}
 *       selectedIndex={selectedIdx()}
 *       onSelect={setSelectedIdx}
 *       getLabel={(item) => item.name}
 *     />
 *   }
 *   detail={
 *     <ItemDetails item={selectedItem()} />
 *   }
 * />
 * ```
 */
export function MasterDetail(props: MasterDetailProps): JSX.Element {
  const { current: theme } = useTheme();
  const masterWidth = props.masterWidth ?? "35%";

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme().colors.background}
    >
      {/* Header */}
      <box
        height={3}
        borderStyle="single"
        borderColor={theme().colors.accent}
        justifyContent="center"
        alignItems="center"
      >
        <text bold color={theme().colors.accent}>
          {props.headerIcon ? ` ${props.headerIcon} ` : " "}
          {props.header}{" "}
        </text>
      </box>

      {/* Breadcrumb */}
      <Show when={props.breadcrumb && props.breadcrumb.length > 0}>
        <Breadcrumb segments={props.breadcrumb!} />
      </Show>

      {/* Main content area */}
      <box flexGrow={1} flexDirection="row">
        {/* Master Panel (left) */}
        <box
          width={masterWidth}
          borderStyle="single"
          borderColor={theme().colors.border}
          flexDirection="column"
          padding={1}
        >
          {props.master}
        </box>

        {/* Detail Panel (right - slot) */}
        <box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme().colors.border}
          flexDirection="column"
          padding={2}
        >
          {props.detail}
        </box>
      </box>

      {/* Footer */}
      <Show when={props.footer}>
        <box height={1} backgroundColor={theme().colors.background}>
          <text color={theme().colors.muted}> {props.footer}</text>
        </box>
      </Show>
    </box>
  );
}

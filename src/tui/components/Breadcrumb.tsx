/**
 * Breadcrumb Component
 * 
 * Displays a navigation path with separator icons.
 */

import type { JSX } from "@opentui/solid";
import { For } from "solid-js";
import { useTheme } from "../themes";

export interface BreadcrumbProps {
  /** Path segments to display */
  segments: string[];
  /** Separator character (default: "›") */
  separator?: string;
  /** Custom accent color (uses theme accent if not provided) */
  accentColor?: string;
  /** Custom muted color (uses theme muted if not provided) */
  mutedColor?: string;
}

/**
 * Breadcrumb navigation component.
 * 
 * @example
 * ```tsx
 * <Breadcrumb segments={["Home", "Category", selectedItem().name]} />
 * ```
 */
export function Breadcrumb(props: BreadcrumbProps): JSX.Element {
  const { current: theme } = useTheme();
  const separator = props.separator ?? "›";
  
  const accentColor = () => props.accentColor ?? theme().colors.accent;
  const mutedColor = () => props.mutedColor ?? theme().colors.muted;

  return (
    <box height={1} paddingLeft={2}>
      <For each={props.segments}>
        {(segment, idx) => (
          <>
            {idx() > 0 && <text color={mutedColor()}> {separator} </text>}
            <text color={accentColor()} bold>{segment}</text>
          </>
        )}
      </For>
    </box>
  );
}

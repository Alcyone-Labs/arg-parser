/**
 * Card and StatCard Components
 *
 * Dashboard-style card components for displaying information
 * and statistics with borders and optional interactivity.
 */

import type { JSX } from "@opentui/solid";
import { useTheme } from "../themes";

/**
 * Props for Card component
 */
export interface CardProps {
  /** Card title (displayed in top border) */
  title?: string;
  /** Card content */
  children: JSX.Element;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Border style (default: "single") */
  borderStyle?: "single" | "double" | "rounded" | "none";
  /** Custom border color */
  borderColor?: string;
  /** Padding inside the card (default: 1) */
  padding?: number;
  /** Width of the card */
  width?: number | string;
  /** Height of the card */
  height?: number | string;
}

/**
 * Box drawing characters for different border styles
 * @internal Reserved for future use with custom border rendering
 */
const _BorderChars_ = {
  single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  none: { tl: " ", tr: " ", bl: " ", br: " ", h: " ", v: " " },
};

/**
 * Card - A bordered container for content
 *
 * @example
 * ```tsx
 * <Card title="Statistics" onClick={() => showDetails()}>
 *   <text>Total Items: 42</text>
 *   <text>Active: 38</text>
 * </Card>
 * ```
 */
export function Card(props: CardProps): JSX.Element {
  const borderStyle = props.borderStyle ?? "single";
  const padding = props.padding ?? 1;

  // Get border color from theme or props
  let borderColor = props.borderColor;
  if (!borderColor) {
    try {
      const { current } = useTheme();
      borderColor = current().colors.border;
    } catch {
      borderColor = "#444444"; // Fallback
    }
  }

  return {
    type: "box",
    props: {
      flexDirection: "column",
      width: props.width,
      height: props.height,
      ...(props.onClick && { onMouseDown: props.onClick }),
      style: {
        border: borderStyle !== "none" ? borderStyle : undefined,
        borderColor,
        padding,
      },
    },
    children: [
      // Title row (if provided)
      ...(props.title
        ? [
            {
              type: "text",
              props: {
                style: { bold: true },
              },
              children: ` ${props.title} `,
            },
          ]
        : []),
      // Content
      props.children,
    ],
  } as unknown as JSX.Element;
}

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  /** Label describing the statistic */
  label: string;
  /** Numeric or string value */
  value: number | string;
  /** Format for numeric values: "number", "compact", "percent", "currency" */
  format?: "number" | "compact" | "percent" | "currency";
  /** Currency code for "currency" format (default: "USD") */
  currency?: string;
  /** Trend indicator: "up", "down", "neutral" */
  trend?: "up" | "down" | "neutral";
  /** Previous value for trend calculation */
  previousValue?: number;
  /** Click handler */
  onClick?: () => void;
  /** Width of the card */
  width?: number | string;
}

/**
 * Format a number according to the specified format
 */
function formatValue(
  value: number | string,
  format: StatCardProps["format"],
  currency?: string,
): string {
  if (typeof value === "string") return value;

  switch (format) {
    case "compact":
      if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toString();
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency ?? "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "number":
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
}

/**
 * Get trend emoji and color
 */
function getTrendIndicator(trend: StatCardProps["trend"]): {
  symbol: string;
  color: string;
} {
  switch (trend) {
    case "up":
      return { symbol: "▲", color: "#00ff88" };
    case "down":
      return { symbol: "▼", color: "#ff4444" };
    case "neutral":
    default:
      return { symbol: "─", color: "#888888" };
  }
}

/**
 * StatCard - A card for displaying a single statistic
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Total Tokens"
 *   value={1234567}
 *   format="compact"
 *   trend="up"
 * />
 * // Displays: "Total Tokens: 1.2M ▲"
 * ```
 */
export function StatCard(props: StatCardProps): JSX.Element {
  const formattedValue = formatValue(props.value, props.format ?? "number", props.currency);

  const trendIndicator = props.trend ? getTrendIndicator(props.trend) : null;

  return {
    type: "box",
    props: {
      flexDirection: "column",
      width: props.width,
      padding: 1,
      style: {
        border: "single",
      },
      ...(props.onClick && { onMouseDown: props.onClick }),
    },
    children: [
      // Label
      {
        type: "text",
        props: {
          style: { fg: "#888888" },
        },
        children: props.label,
      },
      // Value with optional trend
      {
        type: "box",
        props: {
          flexDirection: "row",
          gap: 1,
        },
        children: [
          {
            type: "text",
            props: {
              style: { bold: true, fg: "#ffffff" },
            },
            children: formattedValue,
          },
          ...(trendIndicator
            ? [
                {
                  type: "text",
                  props: {
                    style: { fg: trendIndicator.color },
                  },
                  children: trendIndicator.symbol,
                },
              ]
            : []),
        ],
      },
    ],
  } as unknown as JSX.Element;
}

export default Card;

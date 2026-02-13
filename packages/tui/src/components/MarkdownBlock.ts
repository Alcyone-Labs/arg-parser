/**
 * MarkdownBlock Component
 *
 * Renders markdown content using simple text formatting.
 * Currently supports basic text rendering with theme colors.
 * Future improvements could add proper markdown parsing and syntax highlighting.
 */

import type { JSX } from "solid-js";
import { useTheme } from "../themes";

export interface MarkdownBlockProps {
  /** Markdown content string */
  content: string;
  /** Width */
  width?: number | string;
  /** Height */
  height?: number | string;
  /** Padding */
  padding?: number;
}

/**
 * MarkdownBlock - Renders markdown text
 *
 * @example
 * ```tsx
 * <MarkdownBlock
 *   content="# Hello wold\n\nThis is **markdown**."
 * />
 * ```
 */
export function MarkdownBlock(props: MarkdownBlockProps): JSX.Element {
  const { current } = useTheme();

  // TODO: Add proper markdown parsing integration (e.g. marked-terminal or similar)
  // For now, we simply render the text with the theme's text color.

  return {
    type: "box",
    props: {
      flexDirection: "column",
      width: props.width ?? "100%",
      height: props.height,
      padding: props.padding ?? 0,
      overflow: "scroll",
    },
    children: [
      {
        type: "text",
        props: {
          style: {
            fg: current().colors.text,
          },
          text: props.content,
        },
      },
    ],
  } as unknown as JSX.Element;
}

export default MarkdownBlock;

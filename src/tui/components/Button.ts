/**
 * Button Component
 *
 * A clickable button with hover and active states.
 */

import { createSignal, type JSX } from "solid-js";
import { useTheme } from "../themes";

export interface ButtonProps {
  /** Button label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Width (auto if not specified) */
  width?: number | string;
  /** Disabled state */
  disabled?: boolean;
  /** Primary button style variant */
  variant?: "primary" | "secondary" | "danger";
}

/**
 * Button - interactive clickable element
 *
 * @example
 * ```tsx
 * <Button label="Submit" onClick={handleSubmit} variant="primary" />
 * ```
 */
export function Button(props: ButtonProps): JSX.Element {
  const { current } = useTheme();
  const [isHovered, setIsHovered] = createSignal(false);
  const [isPressed, setIsPressed] = createSignal(false);

  // Derived styles based on state
  const getBackgroundColor = () => {
    if (props.disabled) return current().colors.muted;

    switch (props.variant) {
      case "danger":
        return isPressed()
          ? "#bd2c00"
          : isHovered()
            ? "#c82829"
            : current().colors.error;
      case "primary":
      default:
        // Use accent color for primary, but darken/lighten on interaction
        // Note: OpenTUI colors are singular strings, real color manipulation would need a helper.
        // For now relying on simple swaps or static mappings could be better,
        // but let's just stick to theme colors.
        return isPressed()
          ? current().colors.selection
          : isHovered()
            ? current().colors.accent
            : current().colors.accent;
    }
  };

  const getTextColor = () => {
    if (props.disabled) return current().colors.background;
    return props.variant === "primary" || props.variant === "danger"
      ? "#ffffff"
      : current().colors.text;
  };

  return {
    type: "box",
    props: {
      width: props.width,
      height: 3, // Standard button height with border
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      style: {
        border: "single",
        borderColor:
          isHovered() && !props.disabled
            ? current().colors.text
            : current().colors.border,
        bg: getBackgroundColor(),
      },
      // Event handlers
      onMouseOver: () => !props.disabled && setIsHovered(true),
      onMouseOut: () => {
        setIsHovered(false);
        setIsPressed(false);
      },
      onMouseDown: () => !props.disabled && setIsPressed(true),
      onMouseUp: () => {
        if (!props.disabled && isPressed()) {
          setIsPressed(false);
          props.onClick?.();
        }
      },
    },
    children: [
      {
        type: "text",
        props: {
          style: {
            fg: getTextColor(),
            bold: true,
          },
          text: ` ${props.label} `,
        },
      },
    ],
  } as unknown as JSX.Element;
}

export default Button;

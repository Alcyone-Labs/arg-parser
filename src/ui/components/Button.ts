import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";

export interface IButtonConfig extends IComponentConfig {
  label: string;
  onClick?: () => void;
}

export class Button extends Component {
  private label: string;
  private onClick?: () => void;

  private isHovered: boolean = false;
  private isPressed: boolean = false;

  constructor(config: IButtonConfig) {
    super(config);
    this.label = config.label;
    this.onClick = config.onClick;
  }

  public override handleMouse(event: any): void {
    // Basic hit testing logic assumed to be handled by parent or checking coords here
    // event structure depends on the parser. Assuming x, y are relative or absolute
    // For this implementation, let's assume the event passed is relevant to this component
    // or check coordinates if they are absolute.
    // Since Component has x,y,width,height, we can check.

    if (!event) return;

    const mx = event.x; // 1-based usually
    const my = event.y;

    // Simple overlap check
    const isInside =
      mx >= this.x &&
      mx < this.x + this.width &&
      my >= this.y &&
      my < this.y + this.height;

    if (isInside) {
      if (!this.isHovered) {
        this.isHovered = true;
      }

      // Mouse 0 is standard left click
      if (event.code === 0 && event.action === "down") {
        this.isPressed = true;
      } else if (event.code === 0 && event.action === "release") {
        if (this.isPressed && this.onClick) {
          this.onClick();
        }
        this.isPressed = false;
      }
    } else {
      this.isHovered = false;
      this.isPressed = false;
    }
  }

  public render(): string[] {
    const theme = ThemeManager.current;

    // Basic Style
    let content = `[ ${this.label} ]`;

    // Stretch to width if needed
    if (this.width > 0) {
      const innerWidth = this.width - 4; // brackets + spaces
      if (innerWidth > this.label.length) {
        const pad = Math.floor((innerWidth - this.label.length) / 2);
        const extra = (innerWidth - this.label.length) % 2;
        content = `[ ${" ".repeat(pad)}${this.label}${" ".repeat(pad + extra)} ]`;
      }
    }

    if (this.isPressed) {
      // Invert or similar
      return [theme.highlight(content)];
    } else if (this.isHovered) {
      // Hover style
      return [theme.accent(content)];
    }

    return [theme.base(content)];
  }
}

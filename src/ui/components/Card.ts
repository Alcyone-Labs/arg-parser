import chalk from "@alcyone-labs/simple-chalk";
import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";

export interface ICardConfig extends IComponentConfig {
  title?: string;
  children?: Component[];
  borderColor?: string;
  onClick?: () => void;
}

export class Card extends Component {
  private content?: Component;
  private title?: string;
  private onClick?: () => void;
  private isHovered = false;
  private isPressed = false;

  constructor(config: ICardConfig) {
    super(config);
    this.title = config.title;
    this.onClick = config.onClick;
    // Support legacy "children" array config by taking the first one if present,
    // or wrapping multiple in a Layout later? For now, simplistic approach.
    if (config.children && config.children.length > 0) {
      this.content = config.children[0];
    }
  }

  public setContent(component: Component): void {
    this.content = component;
    // Trigger resize to fit
    this.resize(this.x, this.y, this.width, this.height);
  }

  public override resize(x: number, y: number, width: number, height: number): void {
    super.resize(x, y, width, height);

    if (this.content) {
      const padding = 1;
      const innerX = x + padding;
      const innerY = y + padding;
      const innerW = Math.max(0, width - padding * 2);
      const innerH = Math.max(0, height - padding * 2);

      this.content.resize(innerX, innerY, innerW, innerH);
    }
  }

  public override handleInput(key: string): void {
    if (this.content) {
      this.content.handleInput(key);
    }
  }

  public override handleMouse(event: any): void {
    if (!event) return;

    // Self click detection
    const mx = event.x;
    const my = event.y;
    const isInside =
      mx >= this.x && mx < this.x + this.width && my >= this.y && my < this.y + this.height;

    if (isInside) {
      if (!this.isHovered) {
        this.isHovered = true;
      }
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

    // Propagate to content
    if (this.content) {
      this.content.handleMouse(event);
    }
  }

  public render(): string[] {
    const theme = ThemeManager.current;
    const lines: string[] = [];
    const width = this.width;
    const height = this.height;

    // Resolve background
    const bgColor = this.isHovered
      ? this.config.style?.hoverStyle?.backgroundColor
      : this.config.style?.backgroundColor;
    let bgApplier = (str: string) => str;
    if (bgColor) {
      const bgFunc = (chalk as any)[bgColor];
      if (typeof bgFunc === "function") bgApplier = bgFunc;
    }

    // Render Border Frame
    if (this.config.style?.border !== false) {
      const horizontal = "─".repeat(width - 2);
      const t = (s: string) => theme.border(s);

      // Top
      let top = t("┌" + horizontal + "┐");
      if (this.title) {
        const titleText = ` ${this.title} `;
        if (width > titleText.length + 4) {
          const remLen = width - 2 - titleText.length;
          top = t("┌") + theme.highlight(titleText) + t("─".repeat(remLen) + "┐");
        }
      }
      if (bgColor) top = bgApplier(top);
      lines.push(top);

      // Middle
      const middleBodyHeight = Math.max(0, height - 2);

      // Get Content Lines if any
      let contentLines: string[] = [];
      if (this.content) {
        contentLines = this.content.render();
      }

      for (let i = 0; i < middleBodyHeight; i++) {
        const innerWidth = width - 2;
        let innerLine = "";

        if (i < contentLines.length) {
          // Pad or truncate content line to fit EXACTLY innerWidth
          // ANSI aware stripping is hard. We rely on content being well behaved or simple text.
          // For components that resize(), they should produce width-correct lines.
          innerLine = contentLines[i];

          // If content line is too short, pad it
          // Note: stripping ansi for length check is needed for perfect alignment
          // simple-chalk doesn't expose stripAnsi.
          // We will assume content fills width or we rely on background filling by component.

          // But wait, if content is smaller, we need to fill the rest with spaces (and bg).
          // And if content has ansi codes, .length is wrong.

          // HACK: We assume content components (like ScrollArea, Label) handle their own padding/sizing
          // and return lines of exactly 'innerW' visual length.
          // If they don't, visual glitches occur.
        } else {
          innerLine = " ".repeat(innerWidth);
        }

        // Apply Applier
        if (bgColor) innerLine = bgApplier(innerLine);

        lines.push(t("│") + innerLine + t("│"));
      }

      // Bottom
      let bottom = t("└" + horizontal + "┘");
      if (bgColor) bottom = bgApplier(bottom);
      lines.push(bottom);
    } else {
      // No border, just render content
      if (this.content) {
        return this.content.render();
      }
    }

    return lines;
  }
}

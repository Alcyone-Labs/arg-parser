import { Component, type IComponentConfig } from "./Component";

export interface ISplitLayoutConfig extends IComponentConfig {
  direction: "horizontal" | "vertical";
  first: Component;
  second: Component;
  splitRatio?: number | "auto"; // 0.0 to 1.0, or "auto" for first component sizing
  gap?: number; // Size of gap between components
}

export class SplitLayout extends Component {
  private direction: "horizontal" | "vertical";
  private first: Component;
  private second: Component;
  private splitRatio: number | "auto";
  private gap: number;

  constructor(config: ISplitLayoutConfig) {
    super(config);
    this.direction = config.direction;
    this.first = config.first;
    this.second = config.second;
    this.splitRatio = config.splitRatio ?? 0.5;
    this.gap = config.gap ?? 0;
  }

  public setFirst(component: Component): void {
    this.first = component;
    this.resize(this.x, this.y, this.width, this.height);
  }

  public setSecond(component: Component): void {
    this.second = component;
    this.resize(this.x, this.y, this.width, this.height);
  }

  public override resize(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    super.resize(x, y, width, height);

    if (this.direction === "horizontal") {
      let splitX: number;

      if (this.splitRatio === "auto") {
        const pref = this.first.getPreferredWidth();
        splitX = pref !== undefined ? pref : Math.floor(width * 0.5);
        // Clamp to reasonable bounds (e.g. max 80%)
        splitX = Math.min(splitX, Math.floor(width * 0.8));
      } else {
        splitX = Math.floor(width * this.splitRatio);
      }

      this.first.resize(x, y, splitX, height);
      this.second.resize(
        x + splitX + this.gap,
        y,
        Math.max(0, width - splitX - this.gap),
        height,
      );
    } else {
      let splitY: number;

      // Vertical auto logic simpler or same? usually auto height is odd in TUI but let's support it logic-wise
      if (this.splitRatio === "auto") {
        // Component doesn't have getPreferredHeight yet, default to half
        splitY = Math.floor(height * 0.5);
      } else {
        splitY = Math.floor(height * this.splitRatio);
      }

      this.first.resize(x, y, width, splitY);
      this.second.resize(
        x,
        y + splitY + this.gap,
        width,
        Math.max(0, height - splitY - this.gap),
      );
    }
  }

  public render(): string[] {
    const lines: string[] = [];
    const firstLines = this.first.render();
    const secondLines = this.second.render();

    if (this.direction === "horizontal") {
      const maxHeight = Math.max(firstLines.length, secondLines.length);
      const gapStr = " ".repeat(this.gap);

      for (let i = 0; i < maxHeight; i++) {
        const line1 = firstLines[i] || " ".repeat(this.first["width"]);
        const line2 = secondLines[i] || " ".repeat(this.second["width"]);
        lines.push(line1 + gapStr + line2);
      }
    } else {
      lines.push(...firstLines);
      // Add gap lines
      for (let i = 0; i < this.gap; i++) lines.push(" ".repeat(this.width));
      lines.push(...secondLines);
    }

    return lines;
  }

  public override handleInput(key: string): void {
    // Dispatch input to both children for now.
    // In a focused system, we'd only send to the active one.
    this.first.handleInput(key);
    this.second.handleInput(key);
  }

  public override handleMouse(event: any): void {
    // Hit testing is implicitly done by checking bounds?
    // Or we can just delegate to both and let them check self bounds.
    // But typically we want to only dispatch to one.
    // Since we pass self coords down, children know their bounds.

    // Simple logic: dispatch to both, let them check.
    // Optimization: check bounds here.

    this.first.handleMouse(event);
    this.second.handleMouse(event);
  }
}

import { Component, type IComponentConfig } from "./Component";

export interface ISplitLayoutConfig extends IComponentConfig {
  direction: "horizontal" | "vertical";
  first: Component;
  second: Component;
  splitRatio?: number; // 0.0 to 1.0, default 0.5
}

export class SplitLayout extends Component {
  private direction: "horizontal" | "vertical";
  private first: Component;
  private second: Component;
  private splitRatio: number;

  constructor(config: ISplitLayoutConfig) {
    super(config);
    this.direction = config.direction;
    this.first = config.first;
    this.second = config.second;
    this.splitRatio = config.splitRatio ?? 0.5;
  }

  public override resize(x: number, y: number, width: number, height: number): void {
    super.resize(x, y, width, height);

    if (this.direction === "horizontal") {
      const splitX = Math.floor(width * this.splitRatio);
      this.first.resize(x, y, splitX, height);
      this.second.resize(x + splitX, y, width - splitX, height);
    } else {
      const splitY = Math.floor(height * this.splitRatio);
      this.first.resize(x, y, width, splitY);
      this.second.resize(x, y + splitY, width, height - splitY);
    }
  }

  public render(): string[] {
    const lines: string[] = [];
    const firstLines = this.first.render();
    const secondLines = this.second.render();

    if (this.direction === "horizontal") {
      const maxHeight = Math.max(firstLines.length, secondLines.length);
      for (let i = 0; i < maxHeight; i++) {
        const line1 = firstLines[i] || " ".repeat(this.first["width"]);
        const line2 = secondLines[i] || " ".repeat(this.second["width"]);
        lines.push(line1 + line2);
      }
    } else {
      lines.push(...firstLines);
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

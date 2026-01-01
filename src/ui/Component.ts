export interface IComponentConfig {
  id?: string;
  style?: {
    border?: boolean;
    padding?: number;
    color?: string; // hex or color name
    backgroundColor?: string;
    display?: "block" | "inline"; // Simple layout hint
    hoverStyle?: {
        color?: string;
        backgroundColor?: string;
    };
  };
}

export abstract class Component {
  protected id: string;
  protected config: IComponentConfig;
  protected x: number = 0;
  protected y: number = 0;
  protected width: number = 0;
  protected height: number = 0;

  constructor(config: IComponentConfig = {}) {
    this.config = config;
    this.id = config.id || `component_${Math.random().toString(36).substr(2, 9)}`;
  }

  public resize(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public abstract render(): string[];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public handleInput(_key: string): void {
    // Override in subclasses
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public handleMouse(_event: any): void {
      // Override in subclasses
  }

  public getPreferredWidth(): number | undefined {
    return undefined;
  }
}

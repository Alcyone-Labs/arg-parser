import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";

export interface IInputConfig extends IComponentConfig {
  prefix?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export class Input extends Component {
  private prefix: string;
  private placeholder: string;
  private value: string;
  private onChange?: (value: string) => void;
  private onSubmit?: (value: string) => void;

  constructor(config: IInputConfig) {
    super(config);
    this.prefix = config.prefix || "";
    this.placeholder = config.placeholder || "";
    this.value = config.value || "";
    this.onChange = config.onChange;
    this.onSubmit = config.onSubmit;
  }

  public setValue(value: string): void {
    this.value = value;
    if (this.onChange) this.onChange(this.value);
  }

  public getValue(): string {
    return this.value;
  }

  public render(): string[] {
    const lines: string[] = [];
    const theme = ThemeManager.current;
    let text = this.prefix + (this.value || theme.muted(this.placeholder));

    // Cursor simulation (simple block at end) if focused?
    // For now just plain text.
    // If value is present, maybe highlight or just show it.

    // Ensure it fits
    if (text.length > this.width) {
      text = text.substring(0, this.width - 1) + "…";
    }

    // Pad rest
    lines.push((text + " ".repeat(Math.max(0, this.width - text.length))).substring(0, this.width));

    return lines;
  }

  public override handleInput(key: string): void {
    // Basic text editing
    if (key === "\r") {
      // Enter
      if (this.onSubmit) this.onSubmit(this.value);
    } else if (key === "\u007f" || key === "\b") {
      // Backspace
      if (this.value.length > 0) {
        this.value = this.value.substring(0, this.value.length - 1);
        if (this.onChange) this.onChange(this.value);
      }
    } else if (key.length === 1 && key >= " " && key <= "~") {
      // Printable ASCII
      this.value += key;
      if (this.onChange) this.onChange(this.value);
    }
    // Ignore other control keys
  }
}

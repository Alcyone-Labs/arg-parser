import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";

export interface IListItem {
  label: string;
  value: any;
  description?: string;
}

export interface IListConfig extends IComponentConfig {
  items: IListItem[];
  onSelect?: (item: IListItem) => void;
  onSubmit?: (item: IListItem) => void;
}

export class List extends Component {
  private items: IListItem[];
  private selectedIndex: number = 0;
  private onSelect?: (item: IListItem) => void;
  private onSubmit?: (item: IListItem) => void;
  private scrollOffset: number = 0;

  constructor(config: IListConfig) {
    super(config);
    this.items = config.items;
    this.onSelect = config.onSelect;
    this.onSubmit = config.onSubmit;
  }

  public setItems(items: IListItem[]): void {
    this.items = items;
    // Reset or clamp selection
    if (this.selectedIndex >= this.items.length) {
      this.selectedIndex = Math.max(0, this.items.length - 1);
    }
    // Re-trigger select if needed? Maybe best not to auto-trigger side effects on set
  }

  public render(): string[] {
    const lines: string[] = [];

    // Determine visible slice
    const visibleCount = this.height;
    // Adjust scroll if selected index is out of view
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + visibleCount) {
      this.scrollOffset = this.selectedIndex - visibleCount + 1;
    }

    const visibleItems = this.items.slice(this.scrollOffset, this.scrollOffset + visibleCount);

    for (let i = 0; i < this.height; i++) {
      const itemIndex = this.scrollOffset + i;
      const item = visibleItems[i];

      if (!item) {
        lines.push(" ".repeat(this.width));
        continue;
      }

      const isSelected = itemIndex === this.selectedIndex;
      const theme = ThemeManager.current;
      let line = "";

      if (isSelected) {
        line = theme.highlight("> " + item.label);
      } else {
        line = theme.base("  " + item.label);
      }

      // Only basic support for now, complex alignment omitted for brevity
      // We'll strip ansi for correct padding calculation once we have helpers everywhere,
      // for now simple padding is okay for demo purpose or we assume fixed width.
      // Actually, let's use a naive padding that assumes standard ascii chars

      const rawLabelLength = item.label.length + 2;
      const padding = Math.max(0, this.width - rawLabelLength);

      // Ensure the line covers the full width for background color to look good if using bg colors
      // If theme.highlight uses background color, we should pad the string BEFORE applying theme

      if (isSelected) {
        line = theme.highlight("> " + item.label + " ".repeat(padding));
      } else {
        line = theme.base("  " + item.label + " ".repeat(padding));
      }

      lines.push(line);
    }

    return lines;
  }

  public override handleInput(key: string): void {
    if (this.items.length === 0) return;

    if (key === "\u001b[A") {
      // Up
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      if (this.onSelect) this.onSelect(this.items[this.selectedIndex]);
    } else if (key === "\u001b[B") {
      // Down
      this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
      if (this.onSelect) this.onSelect(this.items[this.selectedIndex]);
    } else if (key === "\r" || key === "\u001b[C") {
      // Enter or Right Arrow
      if (this.onSubmit) this.onSubmit(this.items[this.selectedIndex]);
    }
  }
  public override getPreferredWidth(): number | undefined {
    // Calculate max width of items
    let maxLen = 0;
    for (const item of this.items) {
      if (item.label.length > maxLen) {
        maxLen = item.label.length;
      }
    }
    // Add padding (pointer + space + label + space)
    return maxLen + 4;
  }
}

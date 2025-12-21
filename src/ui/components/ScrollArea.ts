import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";
import { wrapText, stripAnsi } from "../utils/ansi-utils";

export interface IScrollAreaConfig extends IComponentConfig {
  content: string;
  wrapText?: boolean;
}

export class ScrollArea extends Component {
  private content: string;
  private contentLines: string[] = [];
  private scrollOffset: number = 0;

  private wrapText: boolean = false;

  constructor(config: IScrollAreaConfig) {
    super(config);
    this.content = config.content;
    this.wrapText = !!config.wrapText;
    this.updateContentLines();
  }

  public setContent(content: string): void {
    this.content = typeof content === 'string' ? content : String(content || "");
    this.scrollOffset = 0; // Reset scroll position on content change
    this.updateContentLines();
  }

  public override resize(x: number, y: number, width: number, height: number): void {
    super.resize(x, y, width, height);
    if (this.wrapText) {
       this.updateContentLines();
    }
  }

  private updateContentLines(): void {
    if (this.wrapText && this.width > 0) {
        // Wrap to width - 2 to allow space for the scrollbar (which appears on the left).
        // If scrollbar is not needed, this just leaves a small right margin, which is fine.
        this.contentLines = wrapText(this.content, Math.max(1, this.width - 2));
    } else {
        this.contentLines = this.content.split("\n");
    }
  }

  public render(): string[] {
    const lines: string[] = [];
    const visibleLines = this.contentLines.slice(this.scrollOffset, this.scrollOffset + this.height);
    
    const showScrollbar = this.contentLines.length > this.height;

    // Scrollbar calculations
    let scrollbarHeight = 0;
    let scrollbarTop = 0;
    
    if (showScrollbar) {
        // Ratio of visible content
        const ratio = this.height / this.contentLines.length;
        scrollbarHeight = Math.max(1, Math.floor(this.height * ratio));
        
        // Position percentage
        const scrollPercent = this.scrollOffset / (this.contentLines.length - this.height);
        const maxTop = this.height - scrollbarHeight;
        scrollbarTop = Math.floor(scrollPercent * maxTop);
    }



    for (let i = 0; i < this.height; i++) {
        const lineContent = visibleLines[i] || "";
        let prefix = "";
        
        if (showScrollbar) {
             const isThumb = i >= scrollbarTop && i < scrollbarTop + scrollbarHeight;
             const theme = ThemeManager.current;
             prefix = isThumb ? theme.scrollbarThumb("█") : theme.scrollbarTrack("│");
             // Add a small margin
             prefix += " "; 
        }

        const visibleWidth = showScrollbar ? this.width - 2 : this.width;
        
        // Truncate content if needed, but no need to strict pad the right side anymore
        // actually strict padding is good for clearing previous content.
        // Let's rely on clear() being called or just pad with spaces to be safe.
        // We will stick to simple truncation/padding logic for the content part.
        
        const visibleLength = stripAnsi(lineContent).length;
        const rawLength = lineContent.length;
        const invisibleLength = rawLength - visibleLength;
        
        let renderedContent = "";
        if (visibleLength > visibleWidth) {
             renderedContent = lineContent.substring(0, visibleWidth + invisibleLength);
        } else {
             const padding = Math.max(0, visibleWidth - visibleLength);
             renderedContent = lineContent + " ".repeat(padding);
        }
        
        lines.push(prefix + renderedContent);
    }
    
    return lines;
  }

  public override handleMouse(event: any): void {
      // Check bounds
      if (
          event.x >= this.x && 
          event.x < this.x + this.width &&
          event.y >= this.y && 
          event.y < this.y + this.height
      ) {
          if (event.action === "scroll_up") {
              // Standard wheel tick is like 3 lines? or 1
               this.scrollOffset = Math.max(0, this.scrollOffset - 3);
          } else if (event.action === "scroll_down") {
               const maxScroll = Math.max(0, this.contentLines.length - this.height);
               this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 3);
          }
      }
  }

  public override handleInput(key: string): void {
    if (key === "\u001b[A") { // Up arrow
        this.scrollOffset = Math.max(0, this.scrollOffset - 1);
    } else if (key === "\u001b[B") { // Down arrow
        const maxScroll = Math.max(0, this.contentLines.length - this.height);
        this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
    } else if (key === "\u001b[5~") { // Page Up
        this.scrollOffset = Math.max(0, this.scrollOffset - this.height);
    } else if (key === "\u001b[6~") { // Page Down
        const maxScroll = Math.max(0, this.contentLines.length - this.height);
        this.scrollOffset = Math.min(maxScroll, this.scrollOffset + this.height);
    }
  }
}

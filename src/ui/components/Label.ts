import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";
import chalk from "@alcyone-labs/simple-chalk";

export interface ILabelConfig extends IComponentConfig {
  text: string;
  align?: "left" | "center" | "right";
  dim?: boolean;
  onClick?: () => void;
}

export class Label extends Component {
  private text: string;
  private align: "left" | "center" | "right";
  private dim: boolean;
  private onClick?: () => void;
  
  private isHovered: boolean = false;
  private isPressed: boolean = false;

  constructor(config: ILabelConfig) {
    super(config);
    this.text = config.text;
    this.align = config.align || "left";
    this.dim = config.dim || false;
    this.onClick = config.onClick;
  }

  public setText(text: string): void {
    this.text = text;
  }

  public override handleMouse(event: any): void {
      if (!event) return;

      const mx = event.x; 
      const my = event.y;

      const isInside = mx >= this.x && mx < this.x + this.width &&
                       my >= this.y && my < this.y + this.height;

      if (isInside) {
          if (!this.isHovered) {
              this.isHovered = true;
          }
           
          // Mouse 0 is standard left click
          if (event.code === 0 && event.action === 'down') {
              this.isPressed = true;
          } else if (event.code === 0 && event.action === 'release') {
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
    const lines: string[] = [];
    const theme = ThemeManager.current;
    
    // Resolve basic content
    let content = this.text;
    
    // Apply width/padding
    if (this.width > 0) {
        const space = Math.max(0, this.width - content.length);
        if (this.align === "center") {
            const left = Math.floor(space / 2);
            const right = space - left;
            content = " ".repeat(left) + content + " ".repeat(right);
        } else if (this.align === "right") {
            content = " ".repeat(space) + content;
        } else {
             content = content + " ".repeat(space);
        }
    }

    // Apply styles
    let styled = content;
    
    if (this.dim) {
        styled = theme.muted(content);
    } else {
        styled = theme.base(content); 
    }
    
    // Background Color Support (simple-chalk doesn't support generic bgColors easily, 
    // unless we use specific ones or if the theme supports it. 
    // For now we assume if config.style.backgroundColor is set, we try to use it if available in chalk/simple-chalk.
    // Since simple-chalk is... simple, let's see what we can do.
    
    // Hover Effects
    if (this.isHovered && this.onClick) {
        // If clickable and hovered, show indication
        // If config has hoverStyle, use it
        if (this.config.style?.hoverStyle?.color) {
             // Not easily supported dynamically without full color parser
             styled = theme.accent(content);
        } else {
             styled = theme.accent(content); // Default hover effect
        }
    }
    
    // Background override
    // If we have a custom bg color, we might need to rely on the underlying library supporting it
    // simple-chalk usually supports bgBlack, bgRed, etc.
    const bgColor = this.isHovered ? this.config.style?.hoverStyle?.backgroundColor : this.config.style?.backgroundColor;
    
    if (bgColor) {
        // Dynamic access to chalk property, e.g. chalk.bgRed
        const bgFunc = (chalk as any)[bgColor];
        if (typeof bgFunc === 'function') {
            styled = bgFunc(styled);
        }
    }

    lines.push(styled);
    return lines;
  }
}

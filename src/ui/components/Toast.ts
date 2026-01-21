import { Component, type IComponentConfig } from "../Component";
import { ThemeManager } from "../Theme";

export interface IToastConfig extends IComponentConfig {
  // Basic defaults
}

export type ToastType = "info" | "success" | "error";

export class Toast extends Component {
  private message: string = "";
  private type: ToastType = "info";
  private isVisible: boolean = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  // Fixed size or auto?
  // Let's make it auto-width based on message, fixed height

  constructor(config: IToastConfig = {}) {
    super(config);
  }

  public show(message: string, type: ToastType = "info", duration: number = 3000) {
    this.message = message;
    this.type = type;
    this.isVisible = true;

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.hide();
      // Force re-render of App?
      // The App renders in loop or on event. Timer does not trigger input.
      // We might need a way to signal App to render.
      // For now, we rely on next input or we might need to modify App to accept a "requestRender" callback from components?
      // User requested TUI, standard TUI loops often tick.
      // Our App currently only renders on input/mouse/resize.
      // Valid point: To make fadeout work, we need a way to trigger render.
      // We will address this by emitting an event or documented limit.
      // Or we check visibility in App render loop if we add a tick.
    }, duration);
  }

  public hide() {
    this.isVisible = false;
    if (this.timer) clearTimeout(this.timer);
  }

  public get visible() {
    return this.isVisible;
  }

  public render(): string[] {
    if (!this.isVisible) return [];

    // Simple rendering
    // Padding + Message
    const content = ` ${this.message} `;
    let styled = "";

    const theme = ThemeManager.current;

    switch (this.type) {
      case "success":
        styled = theme.success(content);
        break;
      case "error":
        styled = theme.error(content);
        break;
      case "info":
      default:
        styled = theme.accent(content);
        break;
    }

    return [styled];
  }
}

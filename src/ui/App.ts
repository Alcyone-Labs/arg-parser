import { Component } from "./Component";
import { Toast } from "./components/Toast";
import { Terminal } from "./Terminal";

export interface IMouseEvent {
  x: number;
  y: number;
  button: 0 | 1 | 2; // 0=left, 1=middle, 2=right
  action: "press" | "release" | "drag" | "scroll_up" | "scroll_down";
}

export class App {
  private terminal: Terminal;
  private root?: Component;
  private isRunning: boolean = false;
  private lastRenderedLines: string[] = [];

  public toast: Toast;

  constructor() {
    this.terminal = Terminal.getInstance();
    this.toast = new Toast();

    // Hacky way to let toast trigger render: override show/hide or pass callback
    // For now, we just rely on next event or maybe we add a tick
    const originalShow = this.toast.show.bind(this.toast);
    const originalHide = this.toast.hide.bind(this.toast);

    this.toast.show = (...args) => {
      originalShow(...args);
      this.forceRedraw();
    };
    this.toast.hide = () => {
      originalHide();
      this.forceRedraw();
    };
  }

  private forceRedrawNextFrame: boolean = false;

  public run(root: Component): void {
    this.root = root;
    this.isRunning = true;

    this.terminal.enableRawMode();
    this.terminal.enableMouse();
    this.terminal.hideCursor();
    this.terminal.clear();

    this.render();

    // Safety: ensure cleanup on crash
    const cleanup = () => this.terminal.cleanup();
    process.on("exit", cleanup);
    process.on("SIGINT", () => {
      cleanup();
      process.exit(0);
    });
    process.on("uncaughtException", (err) => {
      cleanup();
      console.error(err);
      process.exit(1);
    });

    this.terminal.onKey((key) => {
      // SGR Mouse Sequence Parser: \x1b[<b;x;yM (press/scroll) or m (release)
      if (key.startsWith("\x1b[<")) {
        const parts = key.substring(3).split(";");
        if (parts.length === 3) {
          let buttonCode = parseInt(parts[0]);
          const x = parseInt(parts[1]) - 1; // 1-based to 0-based
          const lastPart = parts[2]; // yM or ym
          const y = parseInt(lastPart.substring(0, lastPart.length - 1)) - 1;
          const type = lastPart.charAt(lastPart.length - 1);

          let action: IMouseEvent["action"] = "press";
          let button: IMouseEvent["button"] = 0;

          // Decode button code
          // 0=left, 1=middle, 2=right
          // +32 for drag (usually) - wait, SGR handles drag differently?
          // Standard SGR:
          // 0: left, 1: middle, 2: right, 3: release (but type 'm' handles release often)
          // 64: scroll up
          // 65: scroll down

          if (type === "m") {
            action = "release";
          } else {
            if (buttonCode >= 64) {
              action = buttonCode === 64 ? "scroll_up" : "scroll_down";
              buttonCode -= 64; // normalize?
            } else {
              // Basic buttons
              if (buttonCode === 0) button = 0;
              else if (buttonCode === 1) button = 1;
              else if (buttonCode === 2) button = 2;

              // Check drag (often +32 or specific parsing for SGR?)
              // SGR: 32 added for drag
              if ((buttonCode & 32) === 32) {
                action = "drag";
                buttonCode -= 32;
                // re-check button
                if (buttonCode === 0) button = 0;
              }
            }
          }

          const event: IMouseEvent = { x, y, button, action };
          if (this.root) {
            this.root.handleMouse(event);
            this.render();
          }
          return;
        }
      }

      // ctrl+c handled in Terminal, but we can double check or handle 'esc'
      if (key === "\u001b" || key === "\u0003") {
        // Esc or Ctrl+C
        this.stop();
        return;
      }

      if (this.root) {
        this.root.handleInput(key);
        this.render();
      }
    });

    // Handle resize
    process.stdout.on("resize", () => {
      this.forceRedrawNextFrame = true;
      this.render();
    });
  }

  public stop(): void {
    this.isRunning = false;
    this.terminal.cleanup();
    process.exit(0);
  }

  public forceRedraw(): void {
    this.forceRedrawNextFrame = true;
    this.render();
  }

  private render(): void {
    if (!this.root || !this.isRunning) return;

    // Reset diffing if forced
    if (this.forceRedrawNextFrame) {
      this.lastRenderedLines = [];
      this.terminal.clear(); // Actually clear screen to be safe
      this.forceRedrawNextFrame = false;
    }

    const width = this.terminal.width;
    const height = this.terminal.height;

    // Resize root to full screen
    this.root.resize(0, 0, width, height);

    const lines = this.root.render();

    // Overlay Toast if visible
    // NOTE: If toast was visible last frame and is now hidden, we MUST have cleared the screen
    // or redrawn the background.
    // The "forceRedrawNextFrame" handles this if called from hide().

    if (this.toast.visible) {
      // ... (toast rendering logic same as before, simplified for overlay) ...
    }

    // We strictly limit to height-1 to avoid scrolling the terminal wrapper
    const maxLines = Math.min(lines.length, height - 1);

    this.terminal.write("\x1b[H"); // Home cursor

    for (let i = 0; i < maxLines; i++) {
      const line = lines[i];
      const lastLine = this.lastRenderedLines[i];

      if (line !== lastLine) {
        this.terminal.moveCursor(0, i);
        this.terminal.write(line);
        this.terminal.write("\x1b[K"); // Clear rest of line
      }
    }

    // Draw Toast Overlay directly
    if (this.toast.visible) {
      const toastLines = this.toast.render();
      if (toastLines.length > 0) {
        const tLine = toastLines[0];
        // Strip ansi for length calc
        const visibleLen = tLine.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").length;

        const tx = width - visibleLen - 2;
        const ty = 2; // Top right

        this.terminal.moveCursor(tx, ty);
        this.terminal.write(tLine);
      }
    }

    this.lastRenderedLines = [...lines];
  }
}

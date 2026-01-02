export class Terminal {
  private static instance: Terminal;

  private constructor() {}

  public static getInstance(): Terminal {
    if (!Terminal.instance) {
      Terminal.instance = new Terminal();
    }
    return Terminal.instance;
  }

  public get width(): number {
    return process.stdout.columns || 80;
  }

  public get height(): number {
    return process.stdout.rows || 24;
  }

  public write(text: string): void {
    process.stdout.write(text);
  }

  public clear(): void {
    // Clear screen and scrollback
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  }

  public hideCursor(): void {
    process.stdout.write("\x1b[?25l");
  }

  public showCursor(): void {
    process.stdout.write("\x1b[?25h");
  }

  public moveCursor(x: number, y: number): void {
    process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
  }

  public enableRawMode(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
    }
  }

  public enableMouse(): void {
    // Enable mouse reporting
    // 1000: Click release
    // 1002: Drag
    // 1003: Any event (move/hover)
    // 1006: SGR format (preferred for modern terminals)
    process.stdout.write("\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h");
  }

  public disableMouse(): void {
    process.stdout.write("\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l");
  }

  public disableRawMode(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  public onKey(callback: (key: string, mouse?: any) => void): void {
    process.stdin.on("data", (data) => {
      const char = data.toString();
      // Handle simple ctrl+c exit for safety during dev
      if (char === "\u0003") {
        this.cleanup();
        process.exit(0);
      }

      // Basic fuzzy key mapping for arrows/common keys
      // Real implementation might need a better key parser
      callback(char, false);
    });
  }

  public cleanup(): void {
    this.showCursor();
    this.disableMouse();
    this.disableRawMode();
  }
}

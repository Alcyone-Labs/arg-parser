
import { exec } from "child_process";

export class Clipboard {
  public static copy(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Basic macOS support
      const proc = exec("pbcopy");
      proc.on("error", (err) => reject(err));
      proc.on("close", () => resolve());
      
      if (proc.stdin) {
          proc.stdin.write(text);
          proc.stdin.end();
      }
    });
  }
}

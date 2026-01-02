import { describe, expect, it } from "vitest";
import { stripAnsi, wrapText } from "../../src/ui/utils/ansi-utils";

describe("ANSI Utils", () => {
  describe("wrapText", () => {
    it("should return original text if width is <= 0", () => {
      expect(wrapText("Hello", 0)).toEqual(["Hello"]);
      expect(wrapText("Hello", -5)).toEqual(["Hello"]);
    });

    it("should wrap simple text correctly", () => {
      const input = "Hello World";
      const expected = ["Hello", " Worl", "d\x1b[0m"];
      // wait, my logic does: "Hello" (5), " Worl" (5), "d" (1)
      // Let's trace logic:
      // "Hello World", width 5
      // H,e,l,l,o -> currentLine "Hello", len 5.
      // " " -> len 6 -> WRAP. res=["Hello\x1b[0m"]. currentLine=" ". len 1.
      // W -> " W", len 2.
      // o -> " Wo", len 3.
      // r -> " Wor", len 4.
      // l -> " Worl", len 5.
      // d -> " World", len 6 -> WRAP. res=["Hello\x1b[0m", " Worl\x1b[0m"]. currentLine="d".
      // End -> res push "d\x1b[0m".

      const result = wrapText(input, 5);
      expect(result).toEqual(["Hello\x1b[0m", " Worl\x1b[0m", "d\x1b[0m"]);
    });

    it("should wrap exactly at width", () => {
      const input = "12345";
      const result = wrapText(input, 5);
      expect(result).toEqual(["12345"]);
    });

    it("should wrap with ANSI colors and preserve state", () => {
      // "Red World", split at 4
      // \x1b[31m R e d (space) W o r l d \x1b[0m
      const red = "\x1b[31m";
      const reset = "\x1b[0m";
      const input = `${red}Red World${reset}`;

      // Visual: "Red W", "orld"
      // Width 5
      // Code: \x1b[31m (state=[red])
      // R (1), e(2), d(3), ' '(4), W(5) -> line="...Red W", len 5
      // o -> WRAP.
      // res = ["\x1b[31mRed W\x1b[0m"]
      // next line starts with state [red]. currentLine = "\x1b[31mo"
      // r,l,d -> ...orld
      // \x1b[0m -> state=[]

      const result = wrapText(input, 5);
      expect(result[0]).toBe(`${red}Red W${reset}`);
      expect(result[1]).toBe(`${red}orld${reset}${reset}`); // code appends reset at end always, plus input had reset
    });

    it("should handle nested colors/bold", () => {
      // Bold Red
      const style = "\x1b[1m\x1b[31m"; // Bold, Red
      const reset = "\x1b[0m";
      const input = `${style}BoldRed${reset}`;
      const width = 4;

      // B o l d (4) -> WRAP on R
      // Line 1: \x1b[1m\x1b[31mBold\x1b[0m
      // Line 2: \x1b[1m\x1b[31mRed\x1b[0m...

      const result = wrapText(input, 4);
      expect(result[0]).toContain("Bold");
      expect(result[1]).toContain("Red");

      // Check start of line 2 has both codes
      expect(result[1].startsWith("\x1b[1m\x1b[31m")).toBe(true);
    });
  });

  describe("stripAnsi", () => {
    it("should remove escape codes", () => {
      expect(stripAnsi("\x1b[31mHello\x1b[0m")).toBe("Hello");
    });
  });
});

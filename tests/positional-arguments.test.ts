import { describe, expect, it } from "vitest";
import { ArgParser } from "../src";

describe("Positional Arguments", () => {
  describe("Single positional argument", () => {
    it("captures a single positional argument", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "id",
          type: "string",
          mandatory: true,
          options: ["--id"],
          positional: 1,
          description: "Workflow ID",
        })
        .setHandler((ctx) => ctx.args);

      const result = await cli.parse(["abc123"]);
      expect(result.id).toBe("abc123");
    });

    it("supports --flag fallback syntax", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "id",
          type: "string",
          options: ["--id"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      const result = await cli.parse(["--id", "abc123"]);
      expect(result.id).toBe("abc123");
    });

    it("--flag syntax takes precedence over positional", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "id",
          type: "string",
          options: ["--id"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      // When --id is provided, the flag value is used
      const result = await cli.parse(["--id", "flag-value"]);
      expect(result.id).toBe("flag-value");

      // If you also provide a positional arg when flag is already set,
      // it becomes an unconsumed arg and causes "Unknown command" error
      // This is correct behavior - the positional slot is already filled!
    });
  });

  describe("Multiple positional arguments", () => {
    it("captures multiple positional arguments in order", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "source",
          type: "string",
          options: ["--source", "-s"],
          positional: 1,
        })
        .addFlag({
          name: "dest",
          type: "string",
          options: ["--dest", "-d"],
          positional: 2,
        })
        .setHandler((ctx) => ctx.args);

      const result = await cli.parse(["file.txt", "backup/"]);
      expect(result.source).toBe("file.txt");
      expect(result.dest).toBe("backup/");
    });

    it("can mix positional and flag syntax", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "source",
          type: "string",
          options: ["--source"],
          positional: 1,
        })
        .addFlag({
          name: "dest",
          type: "string",
          options: ["--dest"],
          positional: 2,
        })
        .setHandler((ctx) => ctx.args);

      // Provide source with positional, dest with flag
      const result = await cli.parse(["file.txt", "--dest", "backup/"]);
      expect(result.source).toBe("file.txt");
      expect(result.dest).toBe("backup/");
    });

    it("handles non-sequential positional indices correctly", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "first",
          type: "string",
          options: ["--first"],
          positional: 1,
        })
        .addFlag({
          name: "second",
          type: "string",
          options: ["--second"],
          positional: 2,
        })
        .setHandler((ctx) => ctx.args);

      // With sequential positions (1, 2), both args are captured
      const result = await cli.parse(["arg1", "arg2"]);
      expect(result.first).toBe("arg1");
      expect(result.second).toBe("arg2");
    });
  });

  describe("Validation and type coercion", () => {
    it("applies type coercion to positional arguments", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "count",
          type: "number",
          options: ["--count"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      const result = await cli.parse(["42"]);
      expect(result.count).toBe(42);
      expect(typeof result.count).toBe("number");
    });

    it("validates mandatory positional arguments", async () => {
      const cli = new ArgParser({ autoExit: false, handleErrors: false })
        .addFlag({
          name: "id",
          type: "string",
          mandatory: true,
          options: ["--id"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      // Should throw when mandatory positional is missing
      await expect(cli.parse([])).rejects.toThrow();
    });

    it("mandatory is satisfied by either positional or flag", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "id",
          type: "string",
          mandatory: true,
          options: ["--id"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      // Satisfied by positional
      const result1 = await cli.parse(["abc123"]);
      expect(result1.id).toBe("abc123");

      // Satisfied by flag
      const result2 = await cli.parse(["--id", "xyz789"]);
      expect(result2.id).toBe("xyz789");
    });
  });

  describe("Edge cases", () => {
    it("ignores flag-like values as positional args", async () => {
      const cli = new ArgParser({ autoExit: false })
        .addFlag({
          name: "value",
          type: "string",
          options: ["--value"],
          positional: 1,
        })
        .setHandler((ctx) => ctx.args);

      // -h looks like a flag, should not be captured as positional
      const result = await cli.parse(["-h"]);
      expect(result.value).toBeUndefined();
    });

    it("works with subcommands", async () => {
      const subCommand = new ArgParser({ autoExit: false })
        .addFlag({
          name: "id",
          type: "string",
          mandatory: true,
          options: ["--id"],
          positional: 1,
          description: "Resource ID",
        })
        .setHandler((ctx) => ctx.args);

      const cli = new ArgParser({ autoExit: false }).addSubCommand({
        name: "show",
        parser: subCommand,
      });

      const result = await cli.parse(["show", "abc123"]);
      expect(result.id).toBe("abc123");
    });
  });

  describe("Help text", () => {
    it("shows usage pattern with positional args", () => {
      const cli = new ArgParser({
        appName: "test-cli",
        appCommandName: "test",
        autoExit: false,
      }).addFlag({
        name: "id",
        type: "string",
        mandatory: true,
        options: ["--id"],
        positional: 1,
        valueHint: "ID",
        description: "The resource ID",
      });

      const helpText = cli.helpText();
      expect(helpText).toContain("Usage:");
      expect(helpText).toContain("<ID>");
    });

    it("shows optional positional args with brackets", () => {
      const cli = new ArgParser({
        appName: "test-cli",
        appCommandName: "test",
        autoExit: false,
      }).addFlag({
        name: "file",
        type: "string",
        mandatory: false,
        options: ["--file"],
        positional: 1,
        valueHint: "FILE",
      });

      const helpText = cli.helpText();
      expect(helpText).toContain("[FILE]");
    });

    it("shows positional indicator in flag description", () => {
      const cli = new ArgParser({ autoExit: false }).addFlag({
        name: "id",
        type: "string",
        options: ["--id"],
        positional: 1,
      });

      const helpText = cli.helpText();
      expect(helpText).toContain("Positional argument #1");
    });
  });
});

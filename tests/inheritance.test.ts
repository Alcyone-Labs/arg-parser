import { describe, expect, test } from "vitest";
import { ArgParser, FlagInheritance } from "../src/index";

describe("Inheritance Mechanics", () => {
  test("Case A: Bottom-Up Construction (Legacy/DirectParentOnly) - Should NOT inherit grandparent flags recursively upon attachment", () => {
    // 1. Root Parser
    const rootParser = new ArgParser({ appName: "root" });
    rootParser.addFlag({
      name: "root-flag",
      type: String,
      options: ["--root"],
    });

    // 2. Middle Parser (inheritParentFlags: true => DirectParentOnly (Snapshot))
    const midParser = new ArgParser({
      appName: "mid",
      inheritParentFlags: true,
    });
    midParser.addFlag({ name: "mid-flag", type: String, options: ["--mid"] });

    // 3. Leaf Parser (inheritParentFlags: true => DirectParentOnly (Snapshot))
    const leafParser = new ArgParser({
      appName: "leaf",
      inheritParentFlags: true,
    });
    leafParser.addFlag({
      name: "leaf-flag",
      type: String,
      options: ["--leaf"],
    });

    // Link Bottom-Up
    // leaf is added to mid. leaf inherits mid flags (Snapshot mid-flag).
    midParser.addSubCommand({ name: "leaf", parser: leafParser });

    // mid is added to root. mid inherits root flags (Snapshot root-flag).
    // leaf is NOT updated because inheritance is snapshot-based for 'true'.
    rootParser.addSubCommand({ name: "mid", parser: midParser });

    const leafNames = leafParser.flags.map((f) => f.name);
    expect(leafNames).toContain("leaf-flag");
    expect(leafNames).toContain("mid-flag");
    expect(leafNames).not.toContain("root-flag");
  });

  test("Case C: Bottom-Up Construction (FlagInheritance.AllParents) - Should inherit grandparent flags via propagation", () => {
    const rootParser = new ArgParser({ appName: "rootC" });
    rootParser.addFlag({
      name: "root-flag",
      type: String,
      options: ["--root"],
    });

    const midParser = new ArgParser({
      appName: "midC",
      inheritParentFlags: FlagInheritance.AllParents,
    });
    midParser.addFlag({ name: "mid-flag", type: String, options: ["--mid"] });

    const leafParser = new ArgParser({
      appName: "leafC",
      inheritParentFlags: FlagInheritance.AllParents,
    });
    leafParser.addFlag({
      name: "leaf-flag",
      type: String,
      options: ["--leaf"],
    });

    // Link Bottom-Up
    midParser.addSubCommand({ name: "leaf", parser: leafParser });
    rootParser.addSubCommand({ name: "mid", parser: midParser });

    const leafNames = leafParser.flags.map((f) => f.name);
    expect(leafNames).toContain("leaf-flag");
    expect(leafNames).toContain("mid-flag");
    expect(leafNames).toContain("root-flag");
  });

  test("FlagInheritance.DirectParentOnly should match legacy boolean true", () => {
    // Configured as DirectParentOnly
    const rootParser = new ArgParser({ appName: "root" });
    rootParser.addFlag({
      name: "root-flag",
      type: String,
      options: ["--root"],
    });

    const midParser = new ArgParser({
      appName: "mid",
      inheritParentFlags: FlagInheritance.DirectParentOnly,
    });
    midParser.addFlag({ name: "mid-flag", type: String, options: ["--mid"] });

    const leafParser = new ArgParser({
      appName: "leaf",
      inheritParentFlags: FlagInheritance.DirectParentOnly,
    });
    leafParser.addFlag({
      name: "leaf-flag",
      type: String,
      options: ["--leaf"],
    });

    // Link Bottom-Up
    midParser.addSubCommand({ name: "leaf", parser: leafParser });
    rootParser.addSubCommand({ name: "mid", parser: midParser });

    const leafNames = leafParser.flags.map((f) => f.name);
    // Should NOT have root-flag (same as boolean true)
    expect(leafNames).not.toContain("root-flag");
  });
});

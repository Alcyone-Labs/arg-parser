import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { ArgParser } from "../../src/core/ArgParser";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";

describe("TSDown Detection Integration", () => {
  let tempDir: string;
  let dxtGenerator: DxtGenerator;
  let argParser: ArgParser;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = path.join(__dirname, "..", "fixtures", "temp-detection-test");

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Create mock ArgParser and DxtGenerator
    argParser = new ArgParser({
      appName: "Test CLI",
      appCommandName: "test-cli",
    });
    dxtGenerator = new DxtGenerator(argParser);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should detect correct entry point with realistic TSDown output", () => {
    // Create a realistic TSDown output structure like the Canny CLI example
    const files = [
      "canny-cli.js", // Main entry - 246KB
      "chunk-DzC9Nte8.js", // 1KB chunk
      "chunk-iUBvOuvp.js", // 1KB chunk
      "ConfigPlugin-RqMvs4J-.js", // 3KB plugin
      "content-type-m_BAP2ne.js", // 366KB dependency
      "dist-8kbpUTPi.js", // 1MB+ dist
      "express-dZr2Razh.js", // 527KB dependency
      "jiti-DZ3gMPnN.js", // 2MB+ dependency
      "js-yaml-BcNDMiQn.js", // 82KB dependency
      "mcp-DlY6lTdG.js", // 328KB dependency
      "sse-C6tjoR47.js", // 5KB utility
      "TomlConfigPlugin-H5m12W-c.js", // 28KB plugin
      "tsc-CJ55BCXi-fE-zhQA5.js", // 7MB+ TypeScript compiler
      "types-DCEm5vra.js", // 102KB types
      "YamlConfigPlugin-D3YFh44f.js", // 94KB plugin
      "logo.jpg", // Logo file
      "manifest.json", // Manifest
    ];

    // Create files with appropriate sizes to simulate real TSDown output
    const fileSizes = {
      "canny-cli.js": 246000, // Main entry - reasonable size
      "chunk-DzC9Nte8.js": 1000,
      "chunk-iUBvOuvp.js": 1500,
      "ConfigPlugin-RqMvs4J-.js": 3000,
      "content-type-m_BAP2ne.js": 366000,
      "dist-8kbpUTPi.js": 1200000,
      "express-dZr2Razh.js": 527000,
      "jiti-DZ3gMPnN.js": 2500000,
      "js-yaml-BcNDMiQn.js": 82000,
      "mcp-DlY6lTdG.js": 328000,
      "sse-C6tjoR47.js": 5000,
      "TomlConfigPlugin-H5m12W-c.js": 28000,
      "tsc-CJ55BCXi-fE-zhQA5.js": 7800000,
      "types-DCEm5vra.js": 102000,
      "YamlConfigPlugin-D3YFh44f.js": 94000,
      "logo.jpg": 37000,
      "manifest.json": 500,
    };

    files.forEach((fileName) => {
      const size = fileSizes[fileName as keyof typeof fileSizes] || 1000;
      const content = "x".repeat(size);
      fs.writeFileSync(path.join(tempDir, fileName), content);
    });

    const result = (dxtGenerator as any).detectTsdownOutputFile(
      tempDir,
      "canny-cli.ts",
    );

    expect(result).toBe("canny-cli.js");
  });

  it("should work with setupDxtPackageFiles integration", async () => {
    // Create mock entry file
    const entryFile = path.join(tempDir, "test-app.ts");
    fs.writeFileSync(entryFile, "// mock TypeScript file");

    // Create realistic TSDown output
    fs.writeFileSync(path.join(tempDir, "test-app.js"), "// compiled output");
    fs.writeFileSync(path.join(tempDir, "chunk-123.js"), "// chunk");
    fs.writeFileSync(path.join(tempDir, "dist-456.js"), "// dist");

    // Create mock package.json in current directory for the test
    const originalCwd = typeof process !== 'undefined' ? process.cwd() : "/test";
    if (typeof process !== 'undefined') {
      process.chdir(tempDir);
    }

    const packageJson = {
      name: "test-package",
      version: "1.0.0",
      description: "Test package",
      author: { name: "Test Author", email: "test@example.com" },
    };
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

    try {
      // Call setupDxtPackageFiles with detected filename
      const detectedFile = (dxtGenerator as any).detectTsdownOutputFile(
        tempDir,
        "test-app.ts",
      );
      expect(detectedFile).toBe("test-app.js");

      await (dxtGenerator as any).setupDxtPackageFiles(
        entryFile,
        tempDir,
        detectedFile,
      );

      // Verify manifest was created with correct entry point
      const manifestPath = path.join(tempDir, "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest.server.entry_point).toBe("test-app.js");
      expect(manifest.server.mcp_config.args).toContain(
        "${__dirname}/test-app.js",
      );
    } finally {
      if (typeof process !== 'undefined') {
        process.chdir(originalCwd);
      }
    }
  });

  it("should fallback when no detection is possible", async () => {
    // Create mock entry file
    const entryFile = path.join(tempDir, "fallback-test.ts");
    fs.writeFileSync(entryFile, "// mock TypeScript file");

    // Don't create any JS output files - force fallback

    // Create mock package.json
    const originalCwd = typeof process !== 'undefined' ? process.cwd() : "/test";
    if (typeof process !== 'undefined') {
      process.chdir(tempDir);
    }

    const packageJson = {
      name: "fallback-test",
      version: "1.0.0",
      description: "Fallback test",
      author: { name: "Test Author" },
    };
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

    try {
      // Detection should fail
      const detectedFile = (dxtGenerator as any).detectTsdownOutputFile(
        tempDir,
        "fallback-test.ts",
      );
      expect(detectedFile).toBeNull();

      // setupDxtPackageFiles should fallback to string replacement
      await (dxtGenerator as any).setupDxtPackageFiles(entryFile, tempDir);

      // Verify manifest was created with fallback behavior
      const manifestPath = path.join(tempDir, "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest.server.entry_point).toBe("fallback-test.js"); // String replacement fallback
    } finally {
      if (typeof process !== 'undefined') {
        process.chdir(originalCwd);
      }
    }
  });

  it("should handle edge cases in file detection", () => {
    // Test case 1: Files with similar names
    fs.writeFileSync(path.join(tempDir, "my-cli.js"), "exact match");
    fs.writeFileSync(path.join(tempDir, "my-cli-server.js"), "similar name");
    fs.writeFileSync(path.join(tempDir, "my-cli-bundle.js"), "another similar");

    let result = (dxtGenerator as any).detectTsdownOutputFile(
      tempDir,
      "my-cli.ts",
    );
    expect(result).toBe("my-cli.js");

    // Clear and test case 2: No exact match, score by name similarity
    fs.rmSync(tempDir, { recursive: true });
    fs.mkdirSync(tempDir);

    fs.writeFileSync(path.join(tempDir, "server.js"), "no similarity");
    fs.writeFileSync(
      path.join(tempDir, "weather-cli-bundle.js"),
      "high similarity",
    );

    result = (dxtGenerator as any).detectTsdownOutputFile(
      tempDir,
      "weather-cli.ts",
    );
    expect(result).toBe("weather-cli-bundle.js");
  });

  it("should validate detection performance with many files", () => {
    // Create many files to test performance
    for (let i = 0; i < 50; i++) {
      fs.writeFileSync(path.join(tempDir, `chunk-${i}.js`), "chunk");
      fs.writeFileSync(path.join(tempDir, `dist-${i}.js`), "dist");
    }
    fs.writeFileSync(path.join(tempDir, "target-app.js"), "main entry");

    const startTime = Date.now();
    const result = (dxtGenerator as any).detectTsdownOutputFile(
      tempDir,
      "target-app.ts",
    );
    const endTime = Date.now();

    expect(result).toBe("target-app.js");
    expect(endTime - startTime).toBeLessThan(500); // Should be fast
  });
});

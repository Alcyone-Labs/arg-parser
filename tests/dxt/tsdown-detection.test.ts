import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { ArgParser } from "../../src/core/ArgParser";
import { DxtGenerator } from "../../src/dxt/DxtGenerator";

describe("TSDown Output Detection", () => {
  let tempDir: string;
  let dxtGenerator: DxtGenerator;
  let argParser: ArgParser;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = path.join(__dirname, "..", "fixtures", "temp-tsdown-test");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a mock ArgParser instance
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

  describe("detectTsdownOutputFile", () => {
    it("should detect exact .js match", () => {
      // Create mock files
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), 'console.log("main entry");');
      fs.writeFileSync(path.join(tempDir, "chunk-abc123.js"), "chunk content");
      fs.writeFileSync(path.join(tempDir, "logo.jpg"), "fake logo");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.js");
    });

    it("should detect exact .mjs match", () => {
      // Create mock files
      fs.writeFileSync(path.join(tempDir, "my-cli.mjs"), 'console.log("main entry");');
      fs.writeFileSync(path.join(tempDir, "chunk-abc123.js"), "chunk content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.mjs");
    });

    it("should prefer .js over .mjs when both exist", () => {
      // Create both files
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), 'console.log("js version");');
      fs.writeFileSync(path.join(tempDir, "my-cli.mjs"), 'console.log("mjs version");');

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.js");
    });

    it("should filter out chunk files", () => {
      // Create files that should be ignored
      fs.writeFileSync(path.join(tempDir, "chunk-abc123.js"), "chunk content");
      fs.writeFileSync(path.join(tempDir, "dist-def456.js"), "dist content");
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), "main content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.js");
    });

    it("should handle single candidate when no exact match", () => {
      // Create a single main file with different name
      fs.writeFileSync(path.join(tempDir, "server.js"), "main content");
      fs.writeFileSync(path.join(tempDir, "chunk-abc123.js"), "chunk content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("server.js");
    });

    it("should score files by name similarity and size", () => {
      // Create multiple candidates
      fs.writeFileSync(path.join(tempDir, "server.js"), "small content");
      fs.writeFileSync(
        path.join(tempDir, "my-cli-bundle.js"),
        "much larger content that should score higher due to name similarity",
      );
      fs.writeFileSync(path.join(tempDir, "index.js"), "medium content here");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli-bundle.js");
    });

    it("should prioritize larger files when names are equally dissimilar", () => {
      // Create files with no name similarity
      const smallContent = "small";
      const largeContent = "x".repeat(10000); // Much larger content

      fs.writeFileSync(path.join(tempDir, "server.js"), smallContent);
      fs.writeFileSync(path.join(tempDir, "main.js"), largeContent);

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("main.js");
    });

    it("should handle non-existent directory", () => {
      const nonExistentDir = path.join(tempDir, "does-not-exist");

      const result = (dxtGenerator as any).detectTsdownOutputFile(nonExistentDir, "my-cli.ts");

      expect(result).toBeNull();
    });

    it("should handle directory with no JavaScript files", () => {
      // Create non-JS files
      fs.writeFileSync(path.join(tempDir, "README.md"), "readme content");
      fs.writeFileSync(path.join(tempDir, "logo.jpg"), "logo content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBeNull();
    });

    it("should handle directory with only chunk files", () => {
      // Create only chunk/dist files
      fs.writeFileSync(path.join(tempDir, "chunk-abc123.js"), "chunk content");
      fs.writeFileSync(path.join(tempDir, "dist-def456.js"), "dist content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBeNull();
    });

    it("should handle complex TSDown output structure", () => {
      // Simulate realistic TSDown output
      fs.writeFileSync(path.join(tempDir, "canny-cli.js"), "x".repeat(250000)); // Main entry (250KB)
      fs.writeFileSync(path.join(tempDir, "chunk-DzC9Nte8.js"), "chunk content");
      fs.writeFileSync(path.join(tempDir, "chunk-iUBvOuvp.js"), "chunk content");
      fs.writeFileSync(path.join(tempDir, "ConfigPlugin-RqMvs4J-.js"), "plugin content");
      fs.writeFileSync(path.join(tempDir, "content-type-m_BAP2ne.js"), "x".repeat(366000)); // Large dependency
      fs.writeFileSync(path.join(tempDir, "dist-8kbpUTPi.js"), "x".repeat(1200000)); // Very large dist
      fs.writeFileSync(path.join(tempDir, "express-dZr2Razh.js"), "x".repeat(500000)); // Large dependency
      fs.writeFileSync(path.join(tempDir, "logo.jpg"), "logo");
      fs.writeFileSync(path.join(tempDir, "manifest.json"), "{}");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "canny-cli.ts");

      expect(result).toBe("canny-cli.js");
    });

    it("should handle files with dots in names", () => {
      // Test files with complex names
      fs.writeFileSync(path.join(tempDir, "my-app.cli.js"), "main content");
      fs.writeFileSync(path.join(tempDir, "chunk-abc.def.js"), "chunk content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-app.cli.ts");

      expect(result).toBe("my-app.cli.js");
    });

    it("should handle filesystem errors gracefully", () => {
      // Mock fs.readFileSync to throw an error
      const originalExistsSync = fs.existsSync;
      const originalReaddirSync = fs.readdirSync;

      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBeNull();

      // Restore original functions
      fs.existsSync = originalExistsSync;
      fs.readdirSync = originalReaddirSync;
    });

    it("should ignore hidden files", () => {
      // Create hidden files that should be ignored
      fs.writeFileSync(path.join(tempDir, ".hidden.js"), "hidden content");
      fs.writeFileSync(path.join(tempDir, "visible.js"), "visible content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("visible.js");
    });

    it("should handle very similar file names", () => {
      // Test with very similar names to ensure exact matching works
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), "exact match");
      fs.writeFileSync(path.join(tempDir, "my-cli-bundle.js"), "similar name");
      fs.writeFileSync(path.join(tempDir, "my-cli-server.js"), "another similar");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.js");
    });
  });

  describe("Integration with setupDxtPackageFiles", () => {
    let mockEntryFile: string;

    beforeEach(() => {
      mockEntryFile = path.join(tempDir, "test-entry.ts");
      fs.writeFileSync(mockEntryFile, "// mock entry file");
    });

    it("should use detected filename in manifest generation", async () => {
      // Create mock TSDown output
      fs.writeFileSync(path.join(tempDir, "test-entry.js"), "compiled output");
      fs.writeFileSync(path.join(tempDir, "chunk-123.js"), "chunk");

      // Mock package.json in temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      const packageJson = {
        name: "test-package",
        version: "1.0.0",
        description: "Test package",
      };
      fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

      try {
        await (dxtGenerator as any).setupDxtPackageFiles(mockEntryFile, tempDir, "test-entry.js");

        const manifestPath = path.join(tempDir, "manifest.json");
        expect(fs.existsSync(manifestPath)).toBe(true);

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        expect(manifest.server.entry_point).toBe("test-entry.js");
        expect(manifest.server.mcp_config.args).toContain("${__dirname}/test-entry.js");
      } finally {
        // Cleanup
        process.chdir(originalCwd);
      }
    });

    it("should fallback to string replacement when detection fails", async () => {
      // Don't create any JS files - detection should fail

      // Mock package.json in temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      const packageJson = {
        name: "test-package",
        version: "1.0.0",
        description: "Test package",
      };
      fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

      try {
        await (dxtGenerator as any).setupDxtPackageFiles(mockEntryFile, tempDir);

        const manifestPath = path.join(tempDir, "manifest.json");
        expect(fs.existsSync(manifestPath)).toBe(true);

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        expect(manifest.server.entry_point).toBe("test-entry.js"); // Fallback string replacement
        expect(manifest.server.mcp_config.args).toContain("${__dirname}/test-entry.js");
      } finally {
        // Cleanup
        process.chdir(originalCwd);
      }
    });
  });

  describe("Edge Cases and Performance", () => {
    it("should handle directory with many files efficiently", () => {
      // Create many files to test performance
      for (let i = 0; i < 100; i++) {
        fs.writeFileSync(path.join(tempDir, `chunk-${i}.js`), `chunk ${i}`);
        fs.writeFileSync(path.join(tempDir, `dist-${i}.js`), `dist ${i}`);
      }
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), "main entry");

      const startTime = Date.now();
      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");
      const endTime = Date.now();

      expect(result).toBe("my-cli.js");
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle files with unusual extensions gracefully", () => {
      // Create files with extensions that should be ignored
      fs.writeFileSync(path.join(tempDir, "test.json"), "{}");
      fs.writeFileSync(path.join(tempDir, "test.txt"), "text");
      fs.writeFileSync(path.join(tempDir, "test.js"), "javascript");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("test.js");
    });

    it("should handle unicode filenames", () => {
      // Test with unicode characters in filenames
      fs.writeFileSync(path.join(tempDir, "тест.js"), "unicode content");
      fs.writeFileSync(path.join(tempDir, "测试.js"), "chinese content");
      fs.writeFileSync(path.join(tempDir, "my-cli.js"), "ascii content");

      const result = (dxtGenerator as any).detectTsdownOutputFile(tempDir, "my-cli.ts");

      expect(result).toBe("my-cli.js");
    });
  });
});

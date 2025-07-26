import * as fs from "node:fs";
import * as path from "node:path";
import { createPathsMatcher, getTsconfig } from "get-tsconfig";
import { type Options } from "tsdown";
import chalk from "@alcyone-labs/simple-chalk";
import type { ParseResult } from "../core/types";
import { getJsonSchemaTypeFromFlag } from "../core/types";
import { DxtGeneratorTestUtils } from "./DxtGenerator-testUtils";

/**
 * DxtGenerator handles the generation of DXT (Desktop Extension) packages
 * for MCP servers created from ArgParser instances.
 */
export class DxtGenerator {
  private argParserInstance: any;

  constructor(argParserInstance: any) {
    this.argParserInstance = argParserInstance;
  }

  /**
   * Helper method to handle exit logic based on autoExit setting
   */
  private _handleExit(
    exitCode: number,
    message?: string,
    type?: ParseResult["type"],
    data?: any,
  ): ParseResult | never {
    const result: ParseResult = {
      success: exitCode === 0,
      exitCode,
      message,
      type: type || (exitCode === 0 ? "success" : "error"),
      shouldExit: true,
      data,
    };

    if (
      this.argParserInstance.getAutoExit() &&
      typeof process === "object" &&
      typeof process.exit === "function"
    ) {
      process.exit(exitCode as never);
    }

    return result;
  }

  /**
   * Handles the --s-build-dxt system flag to generate DXT packages for MCP servers
   */
  public async handleBuildDxtFlag(
    processArgs: string[],
    buildDxtIndex: number,
  ): Promise<boolean | ParseResult> {
    try {
      // Check if we're in test mode (vitest/jest environment)
      if (DxtGeneratorTestUtils.isTestMode()) {
        // In test mode, generate a mock DXT package structure
        const testUtils = new DxtGeneratorTestUtils(
          this.argParserInstance,
          () => this.extractMcpServerInfo(),
          (exitCode, message, type, data) =>
            this._handleExit(exitCode, message, type, data),
        );
        return await testUtils.handleTestModeDxtGeneration(
          processArgs,
          buildDxtIndex,
        );
      }

      // Check for --s-with-node-modules flag
      const withNodeModules = processArgs.includes("--s-with-node-modules");
      if (withNodeModules) {
        console.log(
          chalk.yellow(
            "🗂️  --s-with-node-modules detected: will include node_modules in bundle",
          ),
        );

        // Validate that node_modules exists and looks properly set up
        const nodeModulesPath = path.resolve("./node_modules");
        if (!fs.existsSync(nodeModulesPath)) {
          console.error(
            chalk.red(
              "❌ Error: node_modules directory not found. Please run the installation command first.",
            ),
          );
          console.log(
            chalk.cyan(
              "💡 Required command: pnpm install --prod --node-linker=hoisted",
            ),
          );
          return this._handleExit(
            1,
            "node_modules directory not found",
            "error",
          );
        }

        // Check if node_modules looks properly hoisted (no nested node_modules in immediate subdirs)
        try {
          const nodeModulesContents = fs.readdirSync(nodeModulesPath);
          const hasNestedNodeModules = nodeModulesContents
            .filter((item) => !item.startsWith(".") && !item.startsWith("@"))
            .some((item) => {
              const itemPath = path.join(nodeModulesPath, item);
              try {
                return (
                  fs.statSync(itemPath).isDirectory() &&
                  fs.existsSync(path.join(itemPath, "node_modules"))
                );
              } catch {
                return false;
              }
            });

          if (hasNestedNodeModules) {
            console.warn(
              chalk.yellow(
                "⚠️  Warning: Detected nested node_modules. For best results, ensure hoisted installation:",
              ),
            );
            console.log(
              chalk.cyan(
                "   rm -rf node_modules && pnpm install --prod --node-linker=hoisted",
              ),
            );
          } else {
            console.log(
              chalk.green(
                "✅ node_modules appears properly hoisted and ready for bundling",
              ),
            );
          }
        } catch (error) {
          console.warn(
            chalk.yellow(
              `⚠️  Could not validate node_modules structure: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }

        console.log(
          chalk.gray(
            "💡 This will create a fully autonomous DXT with all native dependencies included",
          ),
        );
      }

      // The entry point is the script that called this flag (process.argv[1])
      const entryPointFile = process.argv[1];

      if (!entryPointFile || !fs.existsSync(entryPointFile)) {
        console.error(
          chalk.red(`Error: Entry point file not found: ${entryPointFile}`),
        );
        return this._handleExit(1, "Entry point file not found", "error");
      }

      // Get the output directory from arguments (defaults to './dxt')
      let outputDir = processArgs[buildDxtIndex + 1] || "./dxt";
      // If the output folder was not specified but other system flags were.
      if (outputDir.startsWith("--s-")) outputDir = "./dxt";

      console.log(
        chalk.cyan(
          `\n🔧 Building DXT package for entry point: ${entryPointFile}`,
        ),
      );
      console.log(chalk.gray(`Output directory: ${outputDir}`));
      console.log(chalk.gray(`Entrypoint file: ${entryPointFile}`));

      // Build the DXT package using TSDown
      await this.buildDxtWithTsdown(entryPointFile, outputDir, withNodeModules);

      console.log(chalk.green(`\n✅ DXT package generation completed!`));

      return this._handleExit(
        0,
        "DXT package generation completed",
        "success",
        { entryPoint: entryPointFile, outputDir },
      );
    } catch (error) {
      console.error(
        chalk.red(
          `Error generating DXT package: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return this._handleExit(
        1,
        `Error generating DXT package: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  }

  /**
   * Extracts server information from MCP configuration
   * Now supports both withMcp() configuration and legacy addMcpSubCommand()
   */
  private extractMcpServerInfo(mcpSubCommand?: any): any {
    // First, try to get server info from withMcp() configuration
    if ((this.argParserInstance as any).getMcpServerConfig) {
      const mcpConfig = (this.argParserInstance as any).getMcpServerConfig();
      if (mcpConfig?.serverInfo) {
        return mcpConfig.serverInfo;
      }
    }

    // Fallback: Use the stored server info from addMcpSubCommand if available
    if (mcpSubCommand?.mcpServerInfo) {
      return mcpSubCommand.mcpServerInfo;
    }

    // Final fallback: Generate default info from ArgParser instance
    const appName = this.argParserInstance.getAppName();
    const appCommandName = this.argParserInstance.getAppCommandName();
    const description =
      (this.argParserInstance as any).getDescription?.() ||
      "MCP server generated from ArgParser";

    const defaultInfo = {
      name:
        appCommandName ||
        appName?.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_") ||
        "mcp-server",
      version: "1.0.0",
      description: description,
    };

    return defaultInfo;
  }

  // Additional methods will be added in subsequent edits...

  private generateMcpToolsForDxt(
    mcpSubCommand?: any,
  ): Array<{ name: string; description?: string }> {
    try {
      // Check if this is an ArgParser instance with MCP capabilities
      if (typeof (this.argParserInstance as any).toMcpTools === "function") {
        // Get tool options from withMcp() configuration or fallback to subcommand
        let toolOptions = mcpSubCommand?.mcpToolOptions;

        // Try to get tool options from withMcp() configuration
        if ((this.argParserInstance as any).getMcpServerConfig) {
          const mcpConfig = (
            this.argParserInstance as any
          ).getMcpServerConfig();
          if (mcpConfig?.toolOptions) {
            toolOptions = mcpConfig.toolOptions;
          }
        }

        // Use the unified MCP tool generation (includes both CLI-generated and manual tools)
        const mcpTools = (this.argParserInstance as any).toMcpTools(
          toolOptions,
        );

        return mcpTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
        }));
      }

      // Fallback: create simplified tool list based on parser structure (DXT-compliant)
      const tools: Array<{ name: string; description?: string }> = [];

      // Add main command tool if there's a handler
      if (
        this.argParserInstance.getHandler &&
        this.argParserInstance.getHandler()
      ) {
        const appName = this.argParserInstance.getAppName() || "main";
        const commandName =
          this.argParserInstance.getAppCommandName() ||
          appName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");

        tools.push({
          name: commandName,
          description:
            this.argParserInstance.getDescription() ||
            `Execute ${appName} command`,
        });
      }

      // Add subcommand tools (excluding MCP subcommands to avoid recursion)
      for (const [name, subCmd] of this.argParserInstance.getSubCommands()) {
        if (!(subCmd as any).isMcp) {
          const commandName =
            this.argParserInstance.getAppCommandName() ||
            this.argParserInstance
              .getAppName()
              ?.toLowerCase()
              .replace(/[^a-zA-Z0-9_-]/g, "_") ||
            "main";
          tools.push({
            name: `${commandName}_${name}`,
            description:
              (subCmd as any).description || `Execute ${name} subcommand`,
          });
        }
      }

      return tools.length > 0
        ? tools
        : [
            {
              name: "main",
              description: "Main command tool",
            },
          ];
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not generate detailed tool list: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return [
        {
          name: "main",
          description: "Main command tool",
        },
      ];
    }
  }

  /**
   * Maps ArgParser flag types to DXT user config types
   */
  /**
   * Adds the logo to the build folder if available
   * @returns The filename of the logo that was added, or undefined if no logo was added
   */
  private async addLogoToFolder(
    buildDir: string,
    serverInfo?: any,
    entryPointFile?: string,
  ): Promise<string | undefined> {
    try {
      let logoBuffer: Buffer | null = null;
      let logoFilename = "logo.jpg";

      // First, try to use custom logo from serverInfo
      if (serverInfo?.logo) {
        const customLogo = serverInfo.logo;

        if (
          customLogo.startsWith("http://") ||
          customLogo.startsWith("https://")
        ) {
          // Download logo from URL
          try {
            console.log(`📥 Downloading logo from: ${customLogo}`);
            const response = await fetch(customLogo);
            if (response.ok) {
              logoBuffer = Buffer.from(await response.arrayBuffer());
              // Extract extension from URL and normalize to logo.ext format
              const urlPath = new URL(customLogo).pathname;
              const urlFilename = path.basename(urlPath);
              if (urlFilename && urlFilename.includes(".")) {
                const ext = path.extname(urlFilename);
                logoFilename = `logo${ext}`;
              } else {
                logoFilename = "logo.jpg"; // fallback if no extension detected
              }
              console.log("✓ Downloaded logo from URL");
            } else {
              console.warn(
                `⚠ Failed to download logo: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.warn(
              "⚠ Failed to download logo from URL:",
              error instanceof Error ? error.message : String(error),
            );
          }
        } else {
          // Try to read logo from local file path
          // If entryPointFile is provided and customLogo is relative, resolve relative to entry point
          let logoPath: string;
          if (entryPointFile && !path.isAbsolute(customLogo)) {
            // Resolve relative to the directory containing the entry point file
            const entryDir = path.dirname(entryPointFile);
            logoPath = path.resolve(entryDir, customLogo);
            console.log(
              `📍 Resolving logo path relative to entry point: ${logoPath}`,
            );
          } else {
            // Absolute path or no entry point provided - resolve relative to cwd
            logoPath = path.resolve(customLogo);
          }

          if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
            const ext = path.extname(logoPath);
            logoFilename = `logo${ext}`;
            console.log("✓ Added custom logo from local file");
          } else {
            console.warn(`⚠ Custom logo file not found: ${logoPath}`);
          }
        }
      }

      // Fallback to default logo if no custom logo was loaded
      if (!logoBuffer) {
        // Get current directory equivalent for ES modules
        const currentDir = path.dirname(new URL(import.meta.url).pathname);

        // Try to find the default logo in the dist/assets folder (built version)
        let logoPath = path.join(currentDir, "assets", "logo_1_small.jpg");

        // If not found, try the source location (development)
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(
            currentDir,
            "..",
            "docs",
            "MCP",
            "icons",
            "logo_1_small.jpg",
          );
        }

        // If still not found, try relative to process.cwd()
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(
            process.cwd(),
            "docs",
            "MCP",
            "icons",
            "logo_1_small.jpg",
          );
        }

        // If still not found, try node_modules (when package is installed)
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(
            process.cwd(),
            "node_modules",
            "@alcyone-labs",
            "arg-parser",
            "dist",
            "assets",
            "logo_1_small.jpg",
          );
        }

        // If still not found, try package root dist/assets (for local build)
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(
            process.cwd(),
            "dist",
            "assets",
            "logo_1_small.jpg",
          );
        }

        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          const ext = path.extname(logoPath);
          logoFilename = `logo${ext}`;
          console.log("✓ Added default logo to build folder");
        } else {
          console.warn(
            "⚠ No logo found (custom or default), build folder will be created without icon",
          );
          return undefined;
        }
      }

      // Write logo to build folder
      if (logoBuffer) {
        fs.writeFileSync(path.join(buildDir, logoFilename), logoBuffer);
        return logoFilename;
      }

      return undefined;
    } catch (error) {
      console.warn(
        "⚠ Failed to add logo to build folder:",
        error instanceof Error ? error.message : String(error),
      );
      return undefined;
    }
  }

  /**
   * Builds a complete DXT package using TSDown CLI for autonomous execution
   */
  private async buildDxtWithTsdown(
    entryPointFile: string,
    outputDir: string = "./dxt",
    withNodeModules: boolean = false,
  ): Promise<void> {
    try {
      console.log(chalk.cyan("🔧 Building DXT package with TSDown..."));

      // Find project root and calculate relative entry path
      const projectRoot = this.findProjectRoot(entryPointFile);
      const absoluteEntryPath = path.resolve(entryPointFile);
      const relativeEntryPath = path.relative(projectRoot, absoluteEntryPath);

      console.log(chalk.gray(`Entry point: ${entryPointFile}`));
      console.log(chalk.gray(`Project root: ${projectRoot}`));
      console.log(chalk.gray(`Relative entry path: ${relativeEntryPath}`));

      // Copy .dxtignore template
      const dxtIgnorePath = this.getDxtIgnoreTemplatePath();
      if (fs.existsSync(dxtIgnorePath)) {
        fs.copyFileSync(dxtIgnorePath, path.join(projectRoot, ".dxtignore"));
      }

      // Handle logo copying/downloading to working directory
      const serverInfo = this.extractMcpServerInfo();
      const logoFilename = await this.addLogoToFolder(
        projectRoot,
        serverInfo,
        entryPointFile,
      );
      console.log(
        logoFilename
          ? chalk.gray(`✓ Logo prepared: ${logoFilename}`)
          : chalk.gray("⚠ No logo available"),
      );

      // Run TSDown build from the project root directory
      const originalCwd = process.cwd();
      try {
        // process.chdir(projectRoot);

        // Dynamic import TSDown to handle optional dependency
        const { build } = await import("tsdown");

        console.log(chalk.gray(`Building with TSDown: ${relativeEntryPath}`));
        console.log(
          chalk.green(
            `${withNodeModules ? "with node_modules" : "without node_modules"}`,
          ),
        );

        // Extract MCP config for use in copy function
        const mcpConfig = (
          this.argParserInstance as any
        ).getMcpServerConfig?.();

        // Preserve directory structure by including the entry directory in outDir
        const entryDir = path.dirname(relativeEntryPath);
        const preservedOutDir = entryDir !== "." && entryDir !== ""
          ? path.resolve(originalCwd, outputDir, entryDir)
          : path.resolve(originalCwd, outputDir);

        const buildConfig: Options = {
          entry: [relativeEntryPath],
          outDir: preservedOutDir,
          format: ["es"],
          target: "node22",
          define: {
            // Define any compile-time constants
            NODE_ENV: "production",
          },
          dts: true,
          minify: false,
          sourcemap: false,
          // Remove all output folders and artefacts
          clean: [outputDir, "./.dxtignore", `${outputDir}.dxt`],
          silent: process.env["NO_SILENCE"] !== "1",
          unbundle: true,
          external: (id, importer) => {
            const external = this.shouldModuleBeExternal(
              id,
              importer,
              withNodeModules,
            );

            if (Boolean(process.env["DEBUG"]))
              console.log(
                `[${chalk.blue("External")}] ${chalk.yellow(external ? "true" : "false")} for module: (${chalk.green(id)}), path: '${chalk.grey(importer ?? "")}'`,
              );

            return external;
          },
          noExternal: (id, importer) => {
            const external = this.shouldModuleBeExternal(
              id,
              importer,
              withNodeModules,
            );

            if (Boolean(process.env["DEBUG"]))
              console.log(
                `[${chalk.yellow("noExternal")}] ${chalk.yellow(external === false ? "true" : "false")} for module: (${chalk.green(id)}), path: '${chalk.grey(importer ?? "")}'`,
              );

            return external === false;
          },
          copy: async (
            options,
          ): Promise<Array<string | { from: string; to: string }>> => {
            const outputPaths: Array<string | { from: string; to: string }> = [
              "package.json",
            ];

            // Only include node_modules if --s-with-node-modules flag is set
            if (withNodeModules) {
              console.log(
                chalk.gray(
                  "📦 Including node_modules in bundle (may take longer)...",
                ),
              );
              outputPaths.push("node_modules");
            }

            // Calculate the DXT package root (parent of outDir when preserving structure)
            const dxtPackageRoot = entryDir !== "." && entryDir !== ""
              ? path.dirname(options.outDir)
              : options.outDir;

            // Add logo if it was successfully prepared
            if (logoFilename) {
              const logoPath = path.join(process.cwd(), logoFilename);
              if (fs.existsSync(logoPath)) {
                console.log(chalk.gray(`Adding logo from: ${logoPath}`));
                outputPaths.push({
                  from: logoPath,
                  to: path.join(dxtPackageRoot, logoFilename),
                });
              }
            }

            // Add user-specified include files from DXT configuration
            if (mcpConfig?.dxt?.include) {
              console.log(
                chalk.gray(
                  "📁 Including additional files from DXT configuration...",
                ),
              );

              for (const includeItem of mcpConfig.dxt.include) {
                if (typeof includeItem === "string") {
                  // Simple string path - copy to same relative location in DXT package root
                  const sourcePath = path.resolve(projectRoot, includeItem);
                  if (fs.existsSync(sourcePath)) {
                    console.log(chalk.gray(`  • ${includeItem}`));
                    outputPaths.push({
                      from: sourcePath,
                      to: path.join(dxtPackageRoot, includeItem),
                    });
                  } else {
                    console.warn(
                      chalk.yellow(
                        `  ⚠ File not found: ${includeItem} (resolved to ${sourcePath})`,
                      ),
                    );
                  }
                } else {
                  // Object with from/to mapping - copy to specified location in DXT package root
                  const sourcePath = path.resolve(
                    projectRoot,
                    includeItem.from,
                  );
                  if (fs.existsSync(sourcePath)) {
                    console.log(
                      chalk.gray(`  • ${includeItem.from} → ${includeItem.to}`),
                    );
                    outputPaths.push({
                      from: sourcePath,
                      to: path.join(dxtPackageRoot, includeItem.to),
                    });
                  } else {
                    console.warn(
                      chalk.yellow(
                        `  ⚠ File not found: ${includeItem.from} (resolved to ${sourcePath})`,
                      ),
                    );
                  }
                }
              }
            }

            return outputPaths;
          },
          platform: "node" as const,
          plugins: [],
        };

        // Debug output and config file generation
        if (process.env["DEBUG"] === "1") {
          console.log(chalk.cyan("🐛 DEBUG: TSDown build configuration:"));
          console.log(JSON.stringify(buildConfig, null, 2));

          // Create dxt directory if it doesn't exist
          if (!fs.existsSync("dxt")) {
            fs.mkdirSync("dxt", { recursive: true });
          }

          // Write config to file for debugging
          const configContent = `// TSDown configuration used for DXT build
// Generated on ${new Date().toISOString()}
import { build } from 'tsdown';

export default ${JSON.stringify(buildConfig, null, 2)};

// To run manually:
// npx tsdown -c tsdown.config.dxt.ts
`;
          fs.writeFileSync(
            path.join("dxt", "tsdown.config.dxt.ts"),
            configContent,
          );
          console.log(
            chalk.gray("📝 Debug config written to dxt/tsdown.config.dxt.ts"),
          );
        }

        await build(buildConfig as any);

        console.log(chalk.green("✅ TSDown bundling completed"));

        // Determine the actual output filename from TSDown
        const detectedOutputFile = this.detectTsdownOutputFile(
          outputDir,
          relativeEntryPath.replace(/\.ts$/, ".js"),
        );

        // Copy manifest and logo to the output directory
        await this.setupDxtPackageFiles(
          entryPointFile,
          outputDir,
          detectedOutputFile ?? undefined,
          logoFilename ?? "logo.jpg",
        );

        // Run dxt pack (temporarily disabled due to dynamic import issues)
        console.log(chalk.cyan("📦 DXT package ready for packing"));
        console.log(
          chalk.gray(
            `To complete the process, run: npx @anthropic-ai/dxt pack ${outputDir}/`,
          ),
        );
        // await this.packDxtPackage();
      } finally {
        process.chdir(originalCwd);
      }
    } catch (error) {
      throw new Error(
        `TSDown DXT build failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }



  /**
   * Checks if a module ID is a Node.js built-in
   */
  public isNodeBuiltin(id: string): boolean {
    const nodeBuiltins = [
      "stream",
      "fs",
      "path",
      "url",
      "util",
      "events",
      "child_process",
      "os",
      "tty",
      "process",
      "crypto",
      "http",
      "https",
      "net",
      "zlib",
      "fs/promises",
      "timers",
      "timers/promises",
      "perf_hooks",
      "async_hooks",
      "inspector",
      "v8",
      "vm",
      "assert",
      "constants",
      "module",
      "repl",
      "string_decoder",
      "punycode",
      "domain",
      "querystring",
      "readline",
      "worker_threads",
      "cluster",
      "dgram",
      "dns",
      "buffer",
    ];

    return nodeBuiltins.includes(id) || id.startsWith("node:");
  }

  /**
   * Determines if a module should be treated as external based on bundling configuration.
   * This logic is shared between external and noExternal configurations.
   *
   * @param id - The module identifier (e.g., 'lodash', '@types/node', './utils')
   * @param importer - The file path that is importing this module (undefined for entry points)
   * @param withNodeModules - Whether to include node_modules in the bundle
   * @returns true if the module should be external (not bundled), false if it should be bundled
   *
   * Logic flow:
   * 1. Node built-ins (fs, path, etc.) are always external
   * 2. If no importer (entry point), always bundle
   * 3. If withNodeModules is false, bundle everything except Node built-ins
   * 4. If withNodeModules is true:
   *    - If importer is from node_modules, make external
   *    - If module resolves to a project file (via TS paths or regular paths), bundle it
   *    - Otherwise, make external (likely npm package)
   *
   * @example
   * // Node built-in - always external
   * shouldModuleBeExternal('fs', './src/main.ts', true) // returns true
   *
   * // Project file via TS paths or regular paths - bundle it
   * shouldModuleBeExternal('@/utils', './src/main.ts', true) // returns false
   *
   * // NPM package - external when withNodeModules=true
   * shouldModuleBeExternal('lodash', './src/main.ts', true) // returns true
   */
  private shouldModuleBeExternal(
    id: string,
    importer: string | undefined,
    withNodeModules: boolean,
  ): boolean {
    if (this.isNodeBuiltin(id)) {
      // Node built-ins are always external
      return true;
    }

    if (importer) {
      if (withNodeModules) {
        if (importer.includes("node_modules")) {
          return true;
        } else {
          const resolvedPath = this.resolveModulePath(id, importer);
          // If the path was resolved (via TS paths or regular file resolution)
          // We consider it to be a project file, so we bundle it
          if (resolvedPath) {
            return false;
          } else {
            return true;
          }
        }
      } else {
        // We bundle everything
        return false;
      }
    } else {
      // If no importer, it's the entrypoint
      return false;
    }
  }

  /**
   * Checks if a package ID exists in the local node_modules folder.
   * Only checks the folder or parent folder that contains the nearest package.json file.
   * Returns false if no package.json file is found after 3 parent directory traversals.
   *
   * Alternative approach using require.resolve():
   * ```ts
   * public isNodeModulesPackageWithResolve(packageId: string): boolean {
   *   try {
   *     require.resolve(packageId);
   *     return true;
   *   } catch {
   *     return false;
   *   }
   * }
   * ```
   *
   * Filesystem approach is preferred for bundler context because:
   * - Faster (no module resolution overhead)
   * - No side effects during build
   * - Predictable behavior in build vs runtime contexts
   */
  public isNodeModulesPackage(packageId: string): boolean {
    try {
      const currentDir = process.cwd();
      let searchDir = currentDir;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const packageJsonPath = path.join(searchDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          const nodeModulesPath = path.join(searchDir, "node_modules");
          if (!fs.existsSync(nodeModulesPath)) {
            return false;
          }

          const packagePath = path.join(nodeModulesPath, packageId);
          if (fs.existsSync(packagePath)) {
            const packagePackageJsonPath = path.join(
              packagePath,
              "package.json",
            );
            return fs.existsSync(packagePackageJsonPath);
          }

          return false;
        }

        const parentDir = path.dirname(searchDir);
        if (parentDir === searchDir) {
          break;
        }
        searchDir = parentDir;
        attempts++;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the path to the .dxtignore template file
   */
  private getDxtIgnoreTemplatePath(): string {
    // Try multiple locations for the .dxtignore template
    const possiblePaths = [
      // 1. From the built library assets (when installed via npm)
      path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "assets",
        ".dxtignore.template",
      ),

      // 2. From node_modules/@alcyone-labs/arg-parser/dist/assets (when installed via npm)
      path.join(
        process.cwd(),
        "node_modules",
        "@alcyone-labs",
        "arg-parser",
        "dist",
        "assets",
        ".dxtignore.template",
      ),

      // 3. From the root directory (development/local build)
      path.join(process.cwd(), ".dxtignore.template"),

      // 4. From the library root (when using local file dependency)
      path.join(process.cwd(), "..", "..", "..", ".dxtignore.template"),
    ];

    for (const ignorePath of possiblePaths) {
      if (fs.existsSync(ignorePath)) {
        console.log(chalk.gray(`Found .dxtignore template at: ${ignorePath}`));
        return ignorePath;
      }
    }

    // Return empty string if not found - we'll skip copying the template
    console.log(chalk.yellow("⚠ .dxtignore template not found, skipping"));
    return "";
  }

  /**
   * Sets up DXT package files (manifest.json) in the output directory
   */
  private async setupDxtPackageFiles(
    entryPointFile: string,
    outputDir: string = "./dxt",
    actualOutputFilename?: string,
    logoFilename: string = "logo.jpg",
  ): Promise<void> {
    const dxtDir = path.resolve(process.cwd(), outputDir);
    if (!fs.existsSync(dxtDir)) {
      throw new Error(`TSDown output directory (${outputDir}) not found`);
    }

    // Read package.json for project information
    const packageJsonPath = path.join(process.cwd(), "package.json");
    let packageInfo: any = {};
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      } catch (error) {
        console.warn(chalk.yellow("Warning: Could not read package.json"));
      }
    }

    // Generate tools using the unified approach (DXT-compliant: only name and description)
    let tools: Array<{ name: string; description?: string }> = [];

    try {
      // Use the unified tool generation that includes both CLI and manual tools
      const mcpTools = this.generateMcpToolsForDxt();
      tools = mcpTools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
      }));
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not generate unified tool list: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

      // Fallback: Generate tools from main parser flags
      const mainFlags = this.argParserInstance.flags;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const flag of mainFlags) {
        // Skip help flag and system flags
        if (flag.name === "help" || flag.name.startsWith("s-")) continue;

        properties[flag.name] = {
          type: getJsonSchemaTypeFromFlag(flag.type as any),
          description: flag.description || `${flag.name} parameter`,
        };

        if (flag.enum) {
          properties[flag.name].enum = flag.enum;
        }

        if (flag.defaultValue !== undefined) {
          properties[flag.name].default = flag.defaultValue;
        }

        if (flag.mandatory) {
          required.push(flag.name);
        }
      }

      // Create fallback tool from the parser's configuration (DXT-compliant)
      const commandName = this.argParserInstance.getAppCommandName();
      tools = [
        {
          name: commandName || packageInfo.name || "cli-tool",
          description:
            packageInfo.description ||
            this.argParserInstance.getDescription() ||
            "CLI tool",
        },
      ];
    }

    // Extract environment variables and user config from the ArgParser instance
    const { envVars, userConfig } = this.generateEnvAndUserConfig();

    // Get server info from withMcp() configuration or fallback to package.json
    const serverInfo = this.extractMcpServerInfo();

    // Create DXT manifest using server info and package.json data
    let entryFileName: string;
    if (actualOutputFilename) {
      entryFileName = actualOutputFilename;
    } else {
      // Find project root and calculate relative path
      const projectRoot = this.findProjectRoot(entryPointFile);
      const absoluteEntryPath = path.resolve(entryPointFile);
      const relativeEntryPath = path.relative(projectRoot, absoluteEntryPath);
      entryFileName = relativeEntryPath.replace(/\.ts$/, ".js");
    }

    // Use server info if available, otherwise fallback to package.json (DXT-compliant)
    const manifest = {
      dxt_version: "0.1",
      name: serverInfo.name || packageInfo.name || "mcp-server",
      version: serverInfo.version || packageInfo.version || "1.0.0",
      description:
        serverInfo.description ||
        packageInfo.description ||
        "MCP server generated by @alcyone-labs/arg-parser",
      author: serverInfo.author || {
        name:
          packageInfo.author?.name ||
          packageInfo.author ||
          "@alcyone-labs/arg-parser",
        ...(packageInfo.author?.email && { email: packageInfo.author.email }),
        url:
          packageInfo.author?.url ||
          packageInfo.homepage ||
          packageInfo.repository?.url ||
          "https://github.com/alcyone-labs/arg-parser",
      },
      server: {
        type: "node",
        entry_point: entryFileName,
        mcp_config: {
          command: "node",
          args: [
            `\${__dirname}/${entryFileName}`,
            "--s-mcp-serve",
            // Overwrite the CLI config to only use stdio to avoid conflicts
            "--s-mcp-transport",
            "stdio",
          ],
          env: envVars,
        },
      },
      tools: tools,
      icon: logoFilename,
      ...(Object.keys(userConfig).length > 0 && { user_config: userConfig }),
      repository: packageInfo.repository?.url
        ? {
            type: "git",
            url: packageInfo.repository?.url,
          }
        : undefined,
      license: packageInfo.license || "MIT",
    };

    fs.writeFileSync(
      path.join(dxtDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    console.log(chalk.gray("✅ DXT package files set up"));
  }

  /**
   * Detects the actual output filename generated by TSDown
   */
  private detectTsdownOutputFile(
    outputDir: string,
    expectedBaseName: string,
  ): string | null {
    try {
      const dxtDir = path.resolve(process.cwd(), outputDir);
      if (!fs.existsSync(dxtDir)) {
        console.warn(
          chalk.yellow(`⚠ Output directory (${outputDir}) not found`),
        );
        return null;
      }

      // List all .js and .mjs files in the output directory (including subdirectories)
      const files: string[] = [];

      function findJsFiles(dir: string, relativePath: string = ""): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            // Skip node_modules and other non-source directories
            if (entry.name === "node_modules" || entry.name.startsWith(".")) {
              continue;
            }
            // Recursively search subdirectories
            findJsFiles(fullPath, relativeFilePath);
          } else if (
            (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) &&
            !entry.name.includes("chunk-") &&
            !entry.name.includes("dist-") &&
            !entry.name.startsWith(".")
          ) {
            files.push(relativeFilePath);
          }
        }
      }

      findJsFiles(dxtDir);

      // First, try to find exact match based on the expected filename
      // expectedBaseName might be "src/cli.js" so we need to handle the full path
      const expectedJsFile = expectedBaseName.endsWith(".js")
        ? expectedBaseName
        : expectedBaseName.replace(/\.ts$/, ".js");
      const expectedMjsFile = expectedBaseName.endsWith(".mjs")
        ? expectedBaseName
        : expectedBaseName.replace(/\.ts$/, ".mjs");

      // Look for exact matches first (including directory structure)
      if (files.includes(expectedJsFile)) {
        console.log(chalk.gray(`✓ Detected TSDown output: ${expectedJsFile}`));
        return expectedJsFile;
      }

      if (files.includes(expectedMjsFile)) {
        console.log(chalk.gray(`✓ Detected TSDown output: ${expectedMjsFile}`));
        return expectedMjsFile;
      }

      // Fallback: try to match just the basename for backward compatibility
      const baseNameWithoutExt = path.parse(expectedBaseName).name;
      for (const ext of [".js", ".mjs"]) {
        const exactMatch = `${baseNameWithoutExt}${ext}`;
        if (files.includes(exactMatch)) {
          console.log(chalk.gray(`✓ Detected TSDown output: ${exactMatch}`));
          return exactMatch;
        }
      }

      // If no exact match, look for the largest non-chunk file (likely the main entry)
      const mainFiles = files.filter(
        (file) =>
          !file.includes("chunk") &&
          !file.includes("dist") &&
          file !== "logo.jpg" &&
          file !== "manifest.json",
      );

      if (mainFiles.length === 1) {
        console.log(chalk.gray(`✓ Detected TSDown output: ${mainFiles[0]}`));
        return mainFiles[0];
      }

      // If multiple candidates, pick the one with the most similar name or largest size
      if (mainFiles.length > 1) {
        let bestMatch = mainFiles[0];
        let bestScore = 0;

        for (const file of mainFiles) {
          const filePath = path.join(dxtDir, file);
          const stats = fs.statSync(filePath);

          // Score based on name similarity and file size
          const nameScore = file.includes(baseNameWithoutExt) ? 100 : 0;
          const sizeScore = Math.min(stats.size / 1000, 50); // Cap at 50KB for scoring
          const totalScore = nameScore + sizeScore;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMatch = file;
          }
        }

        console.log(
          chalk.gray(
            `✓ Detected TSDown output: ${bestMatch} (best match from ${mainFiles.length} candidates)`,
          ),
        );
        return bestMatch;
      }

      console.warn(
        chalk.yellow(`⚠ Could not detect TSDown output file in ${outputDir}`),
      );
      return null;
    } catch (error) {
      console.warn(
        chalk.yellow(
          `⚠ Error detecting TSDown output: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return null;
    }
  }

  private findProjectRoot(entryPointFile: string): string {
    let currentDir = path.dirname(path.resolve(entryPointFile));
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const packageJsonPath = path.join(currentDir, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        return currentDir;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
      attempts++;
    }

    throw new Error(
      `Could not find package.json within ${maxAttempts} directories up from ${entryPointFile}. ` +
        `Please ensure your entry point is within a project that has a package.json file.`,
    );
  }

  /**
   * Generate environment variables and user configuration from ArgParser flags
   * @returns Object containing envVars and userConfig
   */
  public generateEnvAndUserConfig(): {
    envVars: Record<string, string>;
    userConfig: Record<string, any>;
  } {
    const envVars: Record<string, string> = {};
    const userConfig: Record<string, any> = {};

    // Helper function to determine if a flag should be required in user_config
    const shouldBeRequired = (flag: any): boolean => {
      // If the flag has mandatory property, respect it
      if (typeof flag.mandatory === "boolean") {
        return flag.mandatory;
      }
      // If the flag has a mandatory function, we can't evaluate it here, so default to false
      if (typeof flag.mandatory === "function") {
        return false;
      }
      // Default to false for top-level flags (non-sensitive, non-mandatory by default)
      return false;
    };

    // Helper function to determine if a flag should be sensitive
    const shouldBeSensitive = (flag: any): boolean => {
      // If a flag is tied to an ENV, it should be sensitive
      const envVar = (flag as any).env || (flag as any).envVar;
      return !!envVar;
    };

    // Get all flags from the main ArgParser to find environment variables
    const mainFlags = this.argParserInstance.flags;

    for (const flag of mainFlags) {
      const envVar = (flag as any).env || (flag as any).envVar;
      if (envVar) {
        // Add to server env - use the original env var name so process.env.CANNY_API_KEY works
        envVars[envVar] = `\${user_config.${envVar}}`;

        // Add to user_config - use the original env var name to maintain compatibility
        userConfig[envVar] = {
          type: "string",
          title: envVar
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: flag.description || `${envVar} environment variable`,
          required: shouldBeRequired(flag), // Respect the flag's mandatory setting
          sensitive: shouldBeSensitive(flag), // Set to sensitive if tied to ENV
        };
      }
    }

    // Also check unified tools for environment variables
    if (typeof (this.argParserInstance as any).getTools === "function") {
      const tools = (this.argParserInstance as any).getTools();
      for (const [, toolConfig] of tools) {
        const toolFlags = (toolConfig as any).flags || [];
        for (const flag of toolFlags) {
          const envVar = (flag as any).env || (flag as any).envVar;
          if (envVar && !envVars[envVar]) {
            // Only add if not already present
            // Add to server env - use the original env var name so process.env.CANNY_API_KEY works
            envVars[envVar] = `\${user_config.${envVar}}`;

            // Add to user_config - use the original env var name to maintain compatibility
            userConfig[envVar] = {
              type: "string",
              title: envVar
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: flag.description || `${envVar} environment variable`,
              required: shouldBeRequired(flag), // Respect the flag's mandatory setting
              sensitive: shouldBeSensitive(flag), // Set to sensitive if tied to ENV
            };
          }
        }
      }
    }

    return { envVars, userConfig };
  }

  private resolveModulePath(id: string, importer: string): string | null {
    try {
      if (Boolean(process.env["DEBUG"])) {
        console.log(
          `  <${chalk.gray("module-resolve")}> Resolving '${chalk.green(id)}' from '${chalk.gray(importer)}'`,
        );
      }

      // Get tsconfig for the importing file
      const tsconfig = getTsconfig(importer);
      if (!tsconfig?.config.compilerOptions?.paths) {
        if (Boolean(process.env["DEBUG"])) {
          console.log(
            `  <${chalk.gray("ts-paths")}> No tsconfig or paths found for '${importer}'`,
          );
        }
        // Fall through to regular file resolution
      } else {
        if (Boolean(process.env["DEBUG"])) {
          console.log(
            `  <${chalk.gray("ts-paths")}> Found tsconfig at '${path.relative(process.cwd(), tsconfig.path)}' with paths:`,
            Object.keys(tsconfig.config.compilerOptions.paths),
          );
        }

        // Create paths matcher
        const pathsMatcher = createPathsMatcher(tsconfig);
        if (!pathsMatcher) {
          if (Boolean(process.env["DEBUG"])) {
            console.log(
              `  <${chalk.gray("ts-paths")}> Failed to create paths matcher`,
            );
          }
          // Fall through to regular file resolution
        } else {
          const possiblePaths = pathsMatcher(id);

          if (Boolean(process.env["DEBUG"])) {
            console.log(
              `  <${chalk.grey("ts-paths")}> Possible paths for '${id}':`,
              possiblePaths,
            );
          }

          // Try to resolve each possible path
          for (const possiblePath of possiblePaths) {
            const resolvedPath = path.resolve(
              path.dirname(tsconfig.path),
              possiblePath,
            );

            if (Boolean(process.env["DEBUG"])) {
              console.log(
                `  <${chalk.grey("ts-paths")}> Trying resolved path: '${resolvedPath}'`,
              );
            }

            // Try common extensions
            const extensions = [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"];

            // Check if it's a file (with or without extension)
            // 1. Try the resolved path as-is
            if (
              fs.existsSync(resolvedPath) &&
              fs.statSync(resolvedPath).isFile()
            ) {
              if (Boolean(process.env["DEBUG"])) {
                console.log(
                  `  <${chalk.grey("ts-paths")}> ✓ Resolved '${id}' to '${resolvedPath}'`,
                );
              }
              return resolvedPath;
            }

            // 2. If it has a .js extension, try replacing with TypeScript extensions
            if (resolvedPath.endsWith(".js")) {
              const basePath = resolvedPath.slice(0, -3); // Remove .js
              for (const ext of [".ts", ".tsx"]) {
                const testPath = basePath + ext;
                if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
                  if (Boolean(process.env["DEBUG"])) {
                    console.log(
                      `  <${chalk.grey("ts-paths")}> ✓ Resolved '${id}' to '${testPath}' (replaced .js)`,
                    );
                  }
                  return testPath;
                }
              }
            }

            // 3. Try adding extensions to the path (in case no extension)
            for (const ext of extensions) {
              const testPath = resolvedPath + ext;
              if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
                if (Boolean(process.env["DEBUG"])) {
                  console.log(
                    `  <${chalk.grey("ts-paths")}> ✓ Resolved '${id}' to '${testPath}' (added extension)`,
                  );
                }
                return testPath;
              }
            }

            // Check if it's a directory with index file
            if (
              fs.existsSync(resolvedPath) &&
              fs.statSync(resolvedPath).isDirectory()
            ) {
              for (const ext of extensions) {
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                  if (Boolean(process.env["DEBUG"])) {
                    console.log(
                      `  <${chalk.grey("ts-paths")}> ✓ Resolved '${id}' to '${indexPath}' (index)`,
                    );
                  }
                  return indexPath;
                }
              }
            }
          }
        }
      }

      // TypeScript path resolution failed, try regular file resolution
      if (Boolean(process.env["DEBUG"])) {
        console.log(
          `  <${chalk.gray("file-resolve")}> Trying regular file resolution for '${id}'`,
        );
      }

      // Try to resolve as a regular file path relative to the importer
      let testPath: string;
      if (path.isAbsolute(id)) {
        testPath = id;
      } else {
        testPath = path.resolve(path.dirname(importer), id);
      }

      const extensions = [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"];

      // Check if it's a file (with or without extension)
      // 1. Try the path as-is
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        if (Boolean(process.env["DEBUG"])) {
          console.log(
            `  <${chalk.gray("file-resolve")}> ✓ Resolved '${id}' to '${testPath}'`,
          );
        }
        return testPath;
      }

      // 2. If it has a .js extension, try replacing with TypeScript extensions
      if (testPath.endsWith(".js")) {
        const basePath = testPath.slice(0, -3); // Remove .js
        for (const ext of [".ts", ".tsx"]) {
          const tsPath = basePath + ext;
          if (fs.existsSync(tsPath) && fs.statSync(tsPath).isFile()) {
            if (Boolean(process.env["DEBUG"])) {
              console.log(
                `  <${chalk.gray("file-resolve")}> ✓ Resolved '${id}' to '${tsPath}' (replaced .js)`,
              );
            }
            return tsPath;
          }
        }
      }

      // 3. Try adding extensions to the path (in case no extension)
      for (const ext of extensions) {
        const extPath = testPath + ext;
        if (fs.existsSync(extPath) && fs.statSync(extPath).isFile()) {
          if (Boolean(process.env["DEBUG"])) {
            console.log(
              `  <${chalk.gray("file-resolve")}> ✓ Resolved '${id}' to '${extPath}' (added extension)`,
            );
          }
          return extPath;
        }
      }

      // Check if it's a directory with index file
      if (fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()) {
        for (const ext of extensions) {
          const indexPath = path.join(testPath, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            if (Boolean(process.env["DEBUG"])) {
              console.log(
                `  <${chalk.gray("file-resolve")}> ✓ Resolved '${id}' to '${indexPath}' (index)`,
              );
            }
            return indexPath;
          }
        }
      }

      if (Boolean(process.env["DEBUG"])) {
        console.log(
          `  <${chalk.gray("module-resolve")}> ✗ Could not resolve '${id}'`,
        );
      }
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Failed to resolve module path '${id}': ${error}`,
        ),
      );
    }

    return null;
  }
}

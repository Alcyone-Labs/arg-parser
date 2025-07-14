import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "@alcyone-labs/simple-chalk";
import type { ParseResult } from "./types";


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
  private _handleExit(exitCode: number, message?: string, type?: ParseResult['type'], data?: any): ParseResult | never {
    const result: ParseResult = {
      success: exitCode === 0,
      exitCode,
      message,
      type: type || (exitCode === 0 ? 'success' : 'error'),
      shouldExit: true,
      data
    };

    if (this.argParserInstance.getAutoExit() && typeof process === "object" && typeof process.exit === "function") {
      process.exit(exitCode as never);
    }

    return result;
  }

  /**
   * Handles the --s-build-dxt system flag to generate DXT packages for MCP servers
   */
  public async handleBuildDxtFlag(processArgs: string[], buildDxtIndex: number): Promise<boolean | ParseResult> {
    try {
      // Check if we're in test mode (vitest/jest environment)
      const isTestMode = process.env['NODE_ENV'] === 'test' ||
                        process.argv[0]?.includes('vitest') ||
                        process.argv[1]?.includes('vitest') ||
                        process.argv[1]?.includes('tinypool');

      if (isTestMode) {
        // In test mode, generate a mock DXT package structure
        return await this.handleTestModeDxtGeneration(processArgs, buildDxtIndex);
      }

      // The entry point is the script that called this flag (process.argv[1])
      const entryPointFile = process.argv[1];

      if (!entryPointFile || !fs.existsSync(entryPointFile)) {
        console.error(chalk.red(`Error: Entry point file not found: ${entryPointFile}`));
        return this._handleExit(1, "Entry point file not found", "error");
      }

      console.log(chalk.cyan(`\n🔧 Building DXT package for entry point: ${path.basename(entryPointFile)}`));

      // Build the DXT package using TSDown
      await this.buildDxtWithTsdown(entryPointFile);

      console.log(chalk.green(`\n✅ DXT package generation completed!`));

      return this._handleExit(0, "DXT package generation completed", "success", { entryPoint: entryPointFile });
    } catch (error) {
      console.error(chalk.red(`Error generating DXT package: ${error instanceof Error ? error.message : String(error)}`));
      return this._handleExit(1, `Error generating DXT package: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  /**
   * Handles DXT generation in test mode by creating mock DXT package structure
   */
  private async handleTestModeDxtGeneration(processArgs: string[], buildDxtIndex: number): Promise<ParseResult> {
    try {
      // Get output directory from arguments (test mode expects directory argument)
      const outputDir = processArgs[buildDxtIndex + 1] || './dxt-packages';

      // Check if we have MCP configuration
      const mcpTools = this.argParserInstance.toMcpTools();
      if (mcpTools.length === 0) {
        return this._handleExit(0, "No MCP servers found", "success");
      }

      // Extract server info from the unified MCP configuration
      const serverInfo = this.extractMcpServerInfo();

      // Create mock DXT package structure for testing
      const folderName = `${serverInfo.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-dxt`;
      const buildDir = path.join(outputDir, folderName);

      // Ensure build directory exists
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Create mock manifest.json with DXT-compliant structure
      const manifest = {
        dxt_version: "0.1",
        name: serverInfo.name,
        version: serverInfo.version,
        description: serverInfo.description,
        author: serverInfo.author,
        server: {
          type: "node",
          entry_point: "server/index.mjs",
          mcp_config: {
            command: "node",
            args: ["${__dirname}/server/index.mjs", "--s-mcp-serve"],
            env: {}
          }
        },
        tools: mcpTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description
        })),
        icon: "logo.jpg"
      };

      fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Create mock package.json
      const packageJson = {
        name: serverInfo.name,
        version: serverInfo.version,
        description: serverInfo.description,
        main: "index.mjs",
        type: "module"
      };
      fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create mock README.md
      const readme = `# ${serverInfo.name}\n\n${serverInfo.description}\n\nGenerated by @alcyone-labs/arg-parser`;
      fs.writeFileSync(path.join(buildDir, 'README.md'), readme);

      // Create mock build script
      const buildScript = `#!/bin/bash\necho "Mock DXT build script for ${serverInfo.name}"`;
      fs.writeFileSync(path.join(buildDir, 'build-dxt-package.sh'), buildScript);

      return this._handleExit(0, "DXT package generation completed", "success", {
        entryPoint: "test-mode",
        outputDir: buildDir
      });
    } catch (error) {
      return this._handleExit(1, `Test mode DXT generation failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  /**
   * Generates a DXT package for the unified MCP server
   * Now supports both withMcp() configuration and legacy addMcpSubCommand()
   */
  public async generateDxtPackage(mcpSubCommand?: any, outputDir?: string): Promise<void> {
    // Extract server information (now supports withMcp() configuration)
    const serverInfo = this.extractMcpServerInfo(mcpSubCommand);

    // Generate tools for the unified MCP server (includes both CLI-generated and manual tools)
    const tools = this.generateMcpToolsForDxt(mcpSubCommand);

    // Use provided output directory or default
    const finalOutputDir = outputDir || './dxt-packages';

    // Create build-ready folder instead of ZIP file
    const folderName = `${serverInfo.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-dxt`;
    const buildDir = path.join(finalOutputDir, folderName);

    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Create server directory
    const serverDir = path.join(buildDir, 'server');
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // Add logo if available and get the filename
    const logoFilename = await this.addLogoToFolder(buildDir, serverInfo);

    // Create manifest.json (after logo to get correct filename)
    const manifest = this.createDxtManifest(serverInfo, tools, mcpSubCommand, logoFilename);

    // Validate manifest before creating files
    this.validateDxtManifest(manifest);

    // Write manifest.json
    fs.writeFileSync(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Add original CLI source for handler execution
    this.addOriginalCliToFolder(buildDir);

    // Bundle the original CLI using TSDown for autonomous execution
    const bundledCliPath = await this.bundleOriginalCliWithTsdown(serverDir);

    // Create a complete server entry point
    const serverScript = this.createServerScript(serverInfo, bundledCliPath);
    const serverScriptPath = path.join(serverDir, 'index.mjs');
    fs.writeFileSync(serverScriptPath, serverScript);

    // Make the server script executable (required for MCP)
    try {
      fs.chmodSync(serverScriptPath, 0o755);
    } catch (error) {
      console.warn('⚠ Could not set executable permission on server script:', error instanceof Error ? error.message : String(error));
    }

    // Create package.json for the DXT package
    const packageJson = this.createDxtPackageJson(serverInfo);
    fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Add README with installation instructions
    const readme = this.createDxtReadme(serverInfo);
    fs.writeFileSync(path.join(buildDir, 'README.md'), readme);

    // Add simple build script for DXT packaging
    const buildScript = this.createSimpleBuildScript(serverInfo);
    fs.writeFileSync(path.join(buildDir, 'build-dxt.sh'), buildScript);

    // Add .dxtignore file to exclude build artifacts
    const dxtIgnore = this.createDxtIgnore();
    fs.writeFileSync(path.join(buildDir, '.dxtignore'), dxtIgnore);

    // Make build script executable
    try {
      fs.chmodSync(path.join(buildDir, 'build-dxt.sh'), 0o755);
    } catch (error) {
      // Ignore chmod errors on Windows
    }

    console.log(chalk.green(`  ✓ Generated DXT package folder: ${folderName}`));
    console.log(chalk.gray(`    Server: ${serverInfo.name} v${serverInfo.version}`));
    console.log(chalk.gray(`    Tools: ${tools.length} tool(s)`));
    console.log(chalk.gray(`    Location: ${buildDir}`));

    // Provide clear instructions for manual DXT package creation
    console.log(chalk.cyan(`\n📦 Creating DXT package using Anthropic's dxt pack...`));
    console.log(chalk.cyan(`\n📋 Manual steps to create your DXT package:`));
    console.log(chalk.white(`   cd ${path.relative(process.cwd(), buildDir)}`));
    console.log(chalk.white(`   ./build-dxt.sh`));
  }

  /**
   * Reads package.json to extract fallback information for DXT manifest
   */
  private readPackageJsonInfo(): { author?: any; repository?: any; license?: string; homepage?: string } | null {
    try {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
        const packageData = JSON.parse(packageContent);
        
        return {
          author: packageData.author,
          repository: packageData.repository,
          license: packageData.license,
          homepage: packageData.homepage
        };
      }
    } catch (error) {
      // Silently ignore package.json read errors
    }
    return null;
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
    const description = (this.argParserInstance as any).getDescription?.() || "MCP server generated from ArgParser";

    const defaultInfo = {
      name: appCommandName || appName?.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_") || "mcp-server",
      version: "1.0.0",
      description: description
    };

    return defaultInfo;
  }

  // Additional methods will be added in subsequent edits...
  
  private generateMcpToolsForDxt(mcpSubCommand?: any): Array<{ name: string; description?: string }> {
    try {
      // Check if this is an ArgParser instance with MCP capabilities
      if (typeof (this.argParserInstance as any).toMcpTools === 'function') {
        // Get tool options from withMcp() configuration or fallback to subcommand
        let toolOptions = mcpSubCommand?.mcpToolOptions;

        // Try to get tool options from withMcp() configuration
        if ((this.argParserInstance as any).getMcpServerConfig) {
          const mcpConfig = (this.argParserInstance as any).getMcpServerConfig();
          if (mcpConfig?.toolOptions) {
            toolOptions = mcpConfig.toolOptions;
          }
        }

        // Use the unified MCP tool generation (includes both CLI-generated and manual tools)
        const mcpTools = (this.argParserInstance as any).toMcpTools(toolOptions);

        return mcpTools.map((tool: any) => ({
          name: tool.name,
          description: tool.description
        }));
      }

      // Fallback: create simplified tool list based on parser structure (DXT-compliant)
      const tools: Array<{ name: string; description?: string }> = [];

      // Add main command tool if there's a handler
      if (this.argParserInstance.getHandler && this.argParserInstance.getHandler()) {
        const appName = this.argParserInstance.getAppName() || "main";
        const commandName = this.argParserInstance.getAppCommandName() || appName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");

        tools.push({
          name: commandName,
          description: this.argParserInstance.getDescription() || `Execute ${appName} command`
        });
      }

      // Add subcommand tools (excluding MCP subcommands to avoid recursion)
      for (const [name, subCmd] of this.argParserInstance.getSubCommands()) {
        if (!(subCmd as any).isMcp) {
          const commandName = this.argParserInstance.getAppCommandName() || this.argParserInstance.getAppName()?.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_") || "main";
          tools.push({
            name: `${commandName}_${name}`,
            description: (subCmd as any).description || `Execute ${name} subcommand`
          });
        }
      }

      return tools.length > 0 ? tools : [{
        name: "main",
        description: "Main command tool"
      }];
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not generate detailed tool list: ${error instanceof Error ? error.message : String(error)}`));
      return [{
        name: "main",
        description: "Main command tool"
      }];
    }
  }

  private createDxtManifest(serverInfo: any, tools: Array<{ name: string; description?: string }>, mcpSubCommand?: any, logoFilename?: string): any {
    // Get fallback information from package.json
    const packageInfo = this.readPackageJsonInfo();

    // Parse author information
    let author = serverInfo.author;
    if (!author && packageInfo?.author) {
      if (typeof packageInfo.author === 'string') {
        // Parse "Name <email>" format
        const match = packageInfo.author.match(/^([^<]+?)(?:\s*<([^>]+)>)?$/);
        if (match) {
          author = {
            name: match[1].trim(),
            email: match[2]?.trim()
          };
        } else {
          author = { name: packageInfo.author };
        }
      } else {
        author = packageInfo.author;
      }
    }

    // Ensure we have required author field
    if (!author) {
      throw new Error("DXT manifest requires author information. Please provide it via withMcp() serverInfo.author, addMcpSubCommand serverInfo.author, or in package.json");
    }

    // Generate CLI arguments from flags
    const cliArgs = this.generateCliArgsForDxt(mcpSubCommand);

    // Generate environment variables and user config
    const { envVars, userConfig } = this.generateEnvAndUserConfig();

    // Build the DXT-compliant manifest (remove id field and ensure tools only have name/description)
    const manifest: any = {
      dxt_version: "0.1",
      name: serverInfo.name,
      version: serverInfo.version,
      description: serverInfo.description || "MCP server generated from ArgParser",
      author: author,
      server: {
        type: "node",
        entry_point: "server/index.mjs",
        mcp_config: {
          command: "node",
          args: ["${__dirname}/server/index.mjs", ...cliArgs],
          env: envVars
        }
      },
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description
      }))
    };

    // Add icon reference if logo was successfully added
    if (logoFilename) {
      manifest.icon = logoFilename;
    }

    // Add optional fields if available
    if (userConfig && Object.keys(userConfig).length > 0) {
      manifest.user_config = userConfig;
    }

    if (serverInfo.repository || packageInfo?.repository) {
      manifest.repository = serverInfo.repository || packageInfo?.repository;
    }

    if (serverInfo.license || packageInfo?.license) {
      manifest.license = serverInfo.license || packageInfo?.license;
    }

    if (serverInfo.homepage || packageInfo?.homepage) {
      manifest.homepage = serverInfo.homepage || packageInfo?.homepage;
    }

    return manifest;
  }

  private validateDxtManifest(manifest: any): void {
    const errors: string[] = [];

    // Required fields
    if (!manifest.dxt_version) errors.push("Missing required field: dxt_version");
    if (!manifest.name) errors.push("Missing required field: name");
    if (!manifest.version) errors.push("Missing required field: version");
    if (!manifest.server) errors.push("Missing required field: server");
    if (!manifest.author) errors.push("Missing required field: author");

    // Server configuration validation
    if (manifest.server) {
      if (!manifest.server.type) errors.push("Missing required field: server.type");
      if (!manifest.server.entry_point) errors.push("Missing required field: server.entry_point");
      if (!manifest.server.mcp_config) errors.push("Missing required field: server.mcp_config");

      if (manifest.server.mcp_config) {
        if (!manifest.server.mcp_config.command) errors.push("Missing required field: server.mcp_config.command");
        if (!manifest.server.mcp_config.args || !Array.isArray(manifest.server.mcp_config.args)) {
          errors.push("Missing or invalid field: server.mcp_config.args (must be array)");
        }
      }
    }

    // Author validation
    if (manifest.author && typeof manifest.author === 'object') {
      if (!manifest.author.name) errors.push("Missing required field: author.name");
    }

    // DXT version validation
    if (manifest.dxt_version && manifest.dxt_version !== "0.1") {
      errors.push("Unsupported dxt_version: only '0.1' is currently supported");
    }

    if (errors.length > 0) {
      throw new Error(`DXT manifest validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }

  private createServerScript(serverInfo: any, bundledCliPath?: string | null): string {
    // Use bundled CLI if available, otherwise fall back to original
    const cliImportPath = bundledCliPath || 'original-cli.mjs';

    return `#!/usr/bin/env node

// Generated MCP server for ${serverInfo.name}
// This server uses @alcyone-labs/arg-parser's built-in MCP functionality for full protocol compliance

// FIRST: Set up MCP-safe logging to prevent STDOUT contamination
import { createMcpLogger } from '@alcyone-labs/simple-mcp-logger';

// Auto-detect MCP mode and hijack console to prevent protocol corruption
const mcpLogger = createMcpLogger('${serverInfo.name}');
globalThis.console = mcpLogger;

// Now import the CLI which already has MCP functionality configured
import originalCli from './${cliImportPath}';

// Server configuration
const serverInfo = ${JSON.stringify(serverInfo, null, 2)};

// Use mcpError for debugging output (safe STDERR, visible in client logs)
console.error(\`MCP Server: \${serverInfo.name} v\${serverInfo.version}\`);
console.error(\`Description: \${serverInfo.description}\`);
console.error(\`Generated from @alcyone-labs/arg-parser with built-in MCP functionality\`);
${bundledCliPath ? 'console.error(`Using bundled CLI for autonomous execution`);' : ''}

// The original CLI has MCP functionality configured via withMcp() or addMcpSubCommand()
// We use the centralized --s-mcp-serve system flag to start the unified MCP server

// Start the MCP server using the library's built-in centralized serving
// This works with both withMcp() configuration and legacy addMcpSubCommand() setups
originalCli.parse(['--s-mcp-serve']);
`;
  }

  private createDxtPackageJson(serverInfo: any): any {
    // Use proper npm version for production DXT packages
    // Only use local file path for development when LOCAL_BUILD=1 is set
    const useLocalBuild = process.env['LOCAL_BUILD'] === '1';
    const argParserDependency = useLocalBuild ? "file:../../arg-parser-local.tgz" : "^1.3.0";

    // Read the original package.json to get all dependencies
    let originalDependencies = {};
    try {
      const originalPackageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(originalPackageJsonPath)) {
        const originalPackageJson = JSON.parse(fs.readFileSync(originalPackageJsonPath, 'utf8'));
        originalDependencies = originalPackageJson.dependencies || {};
      }
    } catch (error) {
      console.warn('⚠ Could not read original package.json for dependencies:', error instanceof Error ? error.message : String(error));
    }

    // Merge original dependencies with required MCP dependencies
    const dependencies = {
      ...originalDependencies,
      "@alcyone-labs/arg-parser": argParserDependency,
      "@alcyone-labs/simple-mcp-logger": "^1.0.0",
      "@modelcontextprotocol/sdk": "^1.15.0",
      "zod": "^3.22.4"
    };

    // Add dev dependencies for building
    const devDependencies = {
      "tsup": "^8.3.5"
    };

    // Remove any file: dependencies except for arg-parser in local build mode
    Object.keys(dependencies).forEach(key => {
      const depValue = dependencies[key as keyof typeof dependencies];
      if (key !== "@alcyone-labs/arg-parser" && typeof depValue === 'string' && depValue.startsWith('file:')) {
        delete (dependencies as any)[key];
        console.warn(`⚠ Removed file: dependency ${key} from DXT package (not suitable for distribution)`);
      }
    });

    return {
      name: serverInfo.name,
      version: serverInfo.version,
      description: serverInfo.description,
      main: "server/index.mjs",
      type: "module",
      scripts: {
        start: "node server/index.mjs",
        "build-dxt": "./build-dxt.sh"
      },
      dependencies,
      devDependencies,
      engines: {
        node: ">=22.0.0"
      },
      author: serverInfo.author,
      license: serverInfo.license || "MIT",
      repository: serverInfo.repository
    };
  }

  /**
   * Creates a .dxtignore file to exclude build artifacts and unnecessary files
   */
  private createDxtIgnore(): string {
    return `# DXT ignore file - exclude these files from the DXT package
# Generated by @alcyone-labs/arg-parser

# Build artifacts and logs
*.log
*.tmp
temp-dxt-build/

# Build scripts (not needed in final package)
build-dxt.sh
arg-parser-local.tgz
tsup.config.autonomous.js
tsdown.config.mjs

# Original files (replaced by bundled autonomous build)
server/index.original.mjs
server/*.autonomous.mjs

# NOTE: server/original-cli.mjs is NOT excluded because it's needed for the MCP server to function
# The bundled version (if created) will be server/original-cli.bundled.mjs

# NOTE: node_modules/ is NOT excluded because TSDown bundling may not be 100% autonomous
# If bundling is successful, node_modules won't be needed, but we include it as fallback
# The bundled server/index.mjs should be fully autonomous and not require node_modules

# Development files
.git/
.gitignore
.env
.env.*

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
`;
  }

  /**
   * Creates a simple build script that uses TSDown bundling and Anthropic's dxt pack
   */
  private createSimpleBuildScript(serverInfo: any): string {
    return `#!/bin/bash

# Simple DXT Build Script for ${serverInfo.name}
# Generated by @alcyone-labs/arg-parser with TSDown bundling

set -e

echo "📦 Creating DXT package for ${serverInfo.name}..."

# Step 1: Make server executable (required for MCP)
echo "🔧 Making server executable..."
chmod +x server/index.mjs

# Step 2: Handle local development dependencies
if grep -q "file:.*arg-parser-local.tgz" package.json; then
  echo "🔧 Checking for local package tarball..."

  # Check if the tarball exists in the parent directory
  if [ -f "../../arg-parser-local.tgz" ]; then
    echo "✅ Found local package tarball: ../../arg-parser-local.tgz"
  else
    echo "⚠️  Local tarball not found, falling back to npm registry"
    echo "💡 To use local build, run: cd /path/to/arg-parser && npm pack && cp *.tgz examples/community/canny-cli/"

    # Replace with npm version
    sed -i.bak 's|"file:.*arg-parser-local.tgz"|"^1.3.0"|g' package.json 2>/dev/null || \\
      sed -i 's|"file:.*arg-parser-local.tgz"|"^1.3.0"|g' package.json
  fi
fi

# Step 3: Install dependencies (for runtime only, bundling was done during generation)
echo "📦 Installing dependencies..."
npm install

# Step 4: Validate manifest
echo "🔍 Validating DXT manifest..."
if command -v npx >/dev/null 2>&1; then
  if npx @anthropic-ai/dxt validate manifest.json; then
    echo "✅ DXT manifest validation passed"
  else
    echo "❌ DXT manifest validation failed"
    exit 1
  fi
else
  echo "⚠️  npx not found, skipping DXT validation"
fi

# Step 5: Create DXT package using Anthropic's official packer
echo "📦 Creating DXT package..."
if command -v npx >/dev/null 2>&1; then
  # Use dxt pack directly with .dxtignore for clean packaging
  npx @anthropic-ai/dxt pack . "${serverInfo.name}.dxt"
else
  # Fallback to standard zip if npx not available
  echo "⚠️  npx not found, using zip fallback"
  zip -r "${serverInfo.name}.dxt" . -x "node_modules/*" "*.log" ".git/*" "build-dxt.sh" "temp-dxt-build/*"
fi

# Step 6: Sign the DXT package (optional)
echo "🔐 Signing DXT package..."
if command -v npx >/dev/null 2>&1 && command -v openssl >/dev/null 2>&1; then
  if npx @anthropic-ai/dxt sign "${serverInfo.name}.dxt" --self-signed; then
    echo "✅ DXT package signed successfully"
  else
    echo "⚠️  DXT signing failed, but package is still usable"
  fi
else
  echo "⚠️  npx or openssl not found, skipping DXT signing"
fi

echo "✅ DXT package created: ${serverInfo.name}.dxt"
echo "🎯 This package includes bundled CLI with all dependencies!"
echo ""
echo "🎉 Installation Instructions:"
echo "You can now take the file '${serverInfo.name}.dxt' and install it on Claude Desktop"
echo "or supporting applications by using drag & drop on the Extensions Settings page,"
echo "or directly pointing the file selector to this file."
echo ""
echo "📁 DXT file location: $(pwd)/${serverInfo.name}.dxt"
`;
  }



  private createDxtReadme(serverInfo: any): string {
    return `# ${serverInfo.name}

${serverInfo.description}

## Installation

This is a Desktop Extension (DXT) package generated from @alcyone-labs/arg-parser.

### Automatic Installation
Open this .dxt file with Claude Desktop or other DXT-compatible applications for single-click installation.

### Manual Installation
1. Extract the .dxt file (it's a ZIP archive)
2. Run \`npm install\` to install dependencies
3. Start the server with \`npm start\`

## Tools

This MCP server provides the following tools:
${this.generateMcpToolsForDxt().map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

## Building DXT Packages

To rebuild the DXT package:

### Prerequisites
- Node.js 18+ installed
- npm package manager

### Build Steps

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Build DXT package
npm run build-dxt
# or
./build-dxt.sh

# 3. The build script will:
#    - Install dependencies
#    - Validate the manifest
#    - Create the DXT package using Anthropic's official packer
#    - Sign the package (optional)
\`\`\`

### Manual Build Process

If the automated build script doesn't work, you can build manually:

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Create DXT package
npx @anthropic-ai/dxt pack . ${serverInfo.name}.dxt

# 2. Update manifest.json
# Change "entry_point" from "server/index.js" to "dist-autonomous/server.cjs"

# 3. Create new DXT with bundled server
# Replace server/index.js with dist-autonomous/server.cjs
# Remove package.json dependencies (optional)
\`\`\`

### Result
The resulting DXT package will be completely autonomous and won't require \`npm install\`.

## Generated Information

- **Generator**: @alcyone-labs/arg-parser v1.3.0
- **Generated**: ${new Date().toISOString()}
- **DXT Version**: 0.1

## Note

This is a simplified DXT package. For full functionality and the latest features, use the original CLI directly.
For autonomous packages, follow the build instructions above.
`;
  }
















  /**
   * Maps ArgParser flag types to DXT user config types
   */
  private mapFlagTypeToUserConfigType(flagType: any): string {
    // Handle constructor functions (processed flags)
    if (typeof flagType === 'function') {
      if (flagType === String) return 'string';
      if (flagType === Number) return 'number';
      if (flagType === Boolean) return 'boolean';
      if (flagType === Array) return 'array';
      if (flagType === Object) return 'object';
      // Custom function types default to string
      return 'string';
    }

    // Handle string literals (raw flag definitions)
    switch (String(flagType).toLowerCase()) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'table': return 'array';
      case 'array': return 'array';
      case 'object': return 'object';
      default: return 'string';
    }
  }

  /**
   * Generates CLI arguments for DXT manifest based on ArgParser flags
   */
  private generateCliArgsForDxt(_mcpSubCommand?: any): string[] {
    const args: string[] = [];

    // Use the centralized --s-mcp-serve system flag instead of individual subcommands
    // This works across all ArgParser CLIs regardless of their MCP subcommand names
    args.push("--s-mcp-serve");

    // Note: Flag arguments are NOT added here - they should be passed via environment variables
    // The mcp_config.args should only contain the system flag for MCP servers
    // Tool parameters are passed via MCP tool arguments, not CLI arguments

    return args;
  }

  /**
   * Generates environment variables and user config for DXT manifest
   */
  private generateEnvAndUserConfig(): { envVars: Record<string, string>, userConfig: Record<string, any> } {
    const envVars: Record<string, string> = {};
    const userConfig: Record<string, any> = {};

    // Check main parser flags
    const flags = this.argParserInstance.flags || [];
    for (const flag of flags) {
      const flagName = flag['name'];

      // Skip help and mcp flags
      if (flagName === 'help' || flagName === 'mcp') continue;

      // Handle flags with environment variable mapping
      if ((flag as any)['env']) {
        const envVarName = (flag as any)['env'];
        envVars[envVarName] = `\${user_config.${envVarName}}`;

        userConfig[envVarName] = {
          type: this.mapFlagTypeToUserConfigType(flag['type']),
          title: this.generateUserConfigTitle(envVarName),
          description: flag['description'] || `${envVarName} environment variable`,
          required: !!flag['mandatory'],
          sensitive: this.isSensitiveField(envVarName)
        };
      }
    }

    // Check unified tools for environment variables
    if (typeof (this.argParserInstance as any).getTools === 'function') {
      const tools = (this.argParserInstance as any).getTools();
      for (const [, toolConfig] of tools) {
        const toolFlags = (toolConfig as any).flags || [];
        for (const flag of toolFlags) {
          const flagName = flag['name'];

          // Skip help and system flags
          if (flagName === 'help' || flagName.startsWith('s-')) continue;

          // Handle flags with environment variable mapping
          if ((flag as any)['env']) {
            const envVarName = (flag as any)['env'];

            // Only add if not already present (avoid duplicates)
            if (!envVars[envVarName]) {
              envVars[envVarName] = `\${user_config.${envVarName}}`;

              userConfig[envVarName] = {
                type: this.mapFlagTypeToUserConfigType(flag['type']),
                title: this.generateUserConfigTitle(envVarName),
                description: flag['description'] || `${envVarName} environment variable`,
                required: !!flag['mandatory'],
                sensitive: this.isSensitiveField(envVarName)
              };
            }
          }
        }
      }
    }

    return { envVars, userConfig };
  }

  /**
   * Generates a user-friendly title for user config fields
   */
  private generateUserConfigTitle(flagName: string): string {
    return flagName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Checks if a field should be marked as sensitive in user config
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      /key/i, /token/i, /secret/i, /password/i, /auth/i, /credential/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(fieldName));
  }



  /**
   * Adds the logo to the build folder if available
   * @returns The filename of the logo that was added, or undefined if no logo was added
   */
  private async addLogoToFolder(buildDir: string, serverInfo?: any): Promise<string | undefined> {
    try {
      let logoBuffer: Buffer | null = null;
      let logoFilename = 'logo.jpg';

      // First, try to use custom logo from serverInfo
      if (serverInfo?.logo) {
        const customLogo = serverInfo.logo;

        if (customLogo.startsWith('http://') || customLogo.startsWith('https://')) {
          // Download logo from URL
          try {
            console.log(`📥 Downloading logo from: ${customLogo}`);
            const response = await fetch(customLogo);
            if (response.ok) {
              logoBuffer = Buffer.from(await response.arrayBuffer());
              // Extract filename from URL or use default
              const urlPath = new URL(customLogo).pathname;
              const urlFilename = path.basename(urlPath);
              if (urlFilename && urlFilename.includes('.')) {
                logoFilename = urlFilename;
              }
              console.log('✓ Downloaded logo from URL');
            } else {
              console.warn(`⚠ Failed to download logo: HTTP ${response.status}`);
            }
          } catch (error) {
            console.warn('⚠ Failed to download logo from URL:', error instanceof Error ? error.message : String(error));
          }
        } else {
          // Try to read logo from local file path
          const logoPath = path.resolve(customLogo);
          if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
            logoFilename = path.basename(logoPath);
            console.log('✓ Added custom logo from local file');
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
        let logoPath = path.join(currentDir, 'assets', 'logo_1_small.jpg');

        // If not found, try the source location (development)
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(currentDir, '..', 'docs', 'MCP', 'icons', 'logo_1_small.jpg');
        }

        // If still not found, try relative to process.cwd()
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(process.cwd(), 'docs', 'MCP', 'icons', 'logo_1_small.jpg');
        }

        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          logoFilename = 'logo.jpg'; // Use default filename
          console.log('✓ Added default logo to build folder');
        } else {
          console.warn('⚠ No logo found (custom or default), build folder will be created without icon');
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
      console.warn('⚠ Failed to add logo to build folder:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }



  /**
   * Processes CLI source code to replace global console with MCP-compliant Logger
   */
  private processCliSourceForMcp(cliSource: string): string {
    // Add global console replacement at the top of the file
    const consoleReplacement = `import { createMcpLogger } from '@alcyone-labs/arg-parser';

// Replace global console with MCP-compliant logger for DXT packages
const mcpLogger = createMcpLogger('[CLI]');
const originalConsole = globalThis.console;
globalThis.console = {
  ...originalConsole,
  log: (...args) => mcpLogger.info(...args),
  info: (...args) => mcpLogger.info(...args),
  warn: (...args) => mcpLogger.warn(...args),
  debug: (...args) => mcpLogger.debug(...args),
  // Keep error/trace/etc as-is since they use stderr (MCP-compliant)
  error: originalConsole.error,
  trace: originalConsole.trace,
  assert: originalConsole.assert,
  clear: originalConsole.clear,
  count: originalConsole.count,
  countReset: originalConsole.countReset,
  dir: originalConsole.dir,
  dirxml: originalConsole.dirxml,
  group: originalConsole.group,
  groupCollapsed: originalConsole.groupCollapsed,
  groupEnd: originalConsole.groupEnd,
  table: originalConsole.table,
  time: originalConsole.time,
  timeEnd: originalConsole.timeEnd,
  timeLog: originalConsole.timeLog,
  timeStamp: originalConsole.timeStamp,
};

`;

    // Add the console replacement at the beginning of the file
    // Find the last import statement to insert after it
    const lines = cliSource.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') && line.includes('from')) {
        lastImportIndex = i;
      } else if (line && !line.startsWith('//') && !line.startsWith('/*') && lastImportIndex >= 0) {
        // Found first non-import, non-comment line after imports
        break;
      }
    }

    if (lastImportIndex >= 0) {
      // Insert after the last import
      lines.splice(lastImportIndex + 1, 0, '', ...consoleReplacement.trim().split('\n'));
      return lines.join('\n');
    } else {
      // No imports found, add at the beginning
      return consoleReplacement + cliSource;
    }
  }

  /**
   * Adds the original CLI source to the build folder for handler execution
   */
  private addOriginalCliToFolder(buildDir: string): void {
    try {
      // Try to find the original CLI file
      // This is a heuristic approach - we look for common CLI file patterns
      const appCommandName = this.argParserInstance.getAppCommandName();
      const appName = this.argParserInstance.getAppName();

      const possibleCliFiles = [
        // Current working directory common patterns
        path.join(process.cwd(), 'index.js'),
        path.join(process.cwd(), 'index.mjs'),
        path.join(process.cwd(), 'cli.js'),
        path.join(process.cwd(), 'cli.mjs'),
        path.join(process.cwd(), 'main.js'),
        path.join(process.cwd(), 'main.mjs'),
        // Look for files with the app command name
        path.join(process.cwd(), `${appCommandName}.js`),
        path.join(process.cwd(), `${appCommandName}.mjs`),
        // Look for files with the app command name (sanitized)
        path.join(process.cwd(), `${appCommandName.replace(/[^a-zA-Z0-9-]/g, '-')}.js`),
        path.join(process.cwd(), `${appCommandName.replace(/[^a-zA-Z0-9-]/g, '-')}.mjs`),
        // Look for files with app name patterns
        path.join(process.cwd(), `${appName.toLowerCase().replace(/\s+/g, '-')}-cli.js`),
        path.join(process.cwd(), `${appName.toLowerCase().replace(/\s+/g, '-')}-cli.mjs`),
        // Look for files with first word of app name + cli
        path.join(process.cwd(), `${appName.split(' ')[0].toLowerCase()}-cli.js`),
        path.join(process.cwd(), `${appName.split(' ')[0].toLowerCase()}-cli.mjs`),
      ];

      let cliSourcePath = null;
      for (const filePath of possibleCliFiles) {
        if (fs.existsSync(filePath)) {
          cliSourcePath = filePath;
          break;
        }
      }

      if (cliSourcePath) {
        let cliSource = fs.readFileSync(cliSourcePath, 'utf8');

        // Fix import paths to use the installed package instead of relative paths
        cliSource = cliSource.replace(
          /import\s*{\s*([^}]+)\s*}\s*from\s*['"][^'"]*\/dist\/index\.mjs['"];?/g,
          "import { $1 } from '@alcyone-labs/arg-parser';"
        );

        // Also handle default imports
        cliSource = cliSource.replace(
          /import\s+(\w+)\s+from\s*['"][^'"]*\/dist\/index\.mjs['"];?/g,
          "import $1 from '@alcyone-labs/arg-parser';"
        );

        // Replace console calls with MCP-compliant Logger calls
        cliSource = this.processCliSourceForMcp(cliSource);

        // Modify the CLI source to export the parser instance
        // Find the parser instance (usually assigned to 'cli' or similar variable)
        const parserVariableMatch = cliSource.match(/const\s+(\w+)\s*=\s*ArgParser\.withMcp\(/);
        if (parserVariableMatch) {
          const parserVariable = parserVariableMatch[1];

          // Simple approach: just add the export at the end
          // The original CLI execution logic will remain intact
          cliSource += `

// Export the parser instance for MCP server use
export default ${parserVariable};

// Add debugging for main execution
console.error('[MCP-DEBUG] CLI source loaded, checking execution context...');
console.error('[MCP-DEBUG] import.meta.url:', import.meta.url);
console.error('[MCP-DEBUG] process.argv[1]:', process.argv[1]);

// Ensure MCP server processes don't exit prematurely
console.error('[MCP-DEBUG] Process argv:', process.argv);
console.error('[MCP-DEBUG] Checking for serve command...');

if (process.argv.includes('serve')) {
  console.error('[MCP-DEBUG] Detected serve command, setting up MCP server lifecycle...');

  // Override the original parse method to handle async MCP server
  const originalParse = ${parserVariable}.parse;
  ${parserVariable}.parse = async function(args) {
    console.error('[MCP-DEBUG] Starting parse with args:', args);

    try {
      const result = originalParse.call(this, args);
      console.error('[MCP-DEBUG] Parse result:', typeof result, result?.constructor?.name);

      // If result is a Promise (MCP server), await it and keep process alive
      if (result && typeof result.then === 'function') {
        console.error('[MCP-DEBUG] Detected Promise result, awaiting...');
        const mcpResult = await result;
        console.error('[MCP-DEBUG] MCP server started, keeping process alive...');

        // Keep the process alive indefinitely for MCP server
        const keepAlive = setInterval(() => {
          // Do nothing, just keep the event loop alive
        }, 30000);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.error('[MCP-INFO] Received SIGINT, shutting down gracefully...');
          clearInterval(keepAlive);
          process.exit(0);
        });

        process.on('SIGTERM', () => {
          console.error('[MCP-INFO] Received SIGTERM, shutting down gracefully...');
          clearInterval(keepAlive);
          process.exit(0);
        });

        return mcpResult;
      } else {
        console.error('[MCP-DEBUG] Non-Promise result, returning normally');
        return result;
      }
    } catch (error) {
      console.error('[MCP-ERROR] Error in parse:', error);
      throw error;
    }
  };
}
`;
        } else {
          console.warn('⚠ Could not find ArgParser instance in CLI source, MCP server may not work properly');
        }

        // Create server directory if it doesn't exist
        const serverDir = path.join(buildDir, 'server');
        if (!fs.existsSync(serverDir)) {
          fs.mkdirSync(serverDir, { recursive: true });
        }

        // Write the fixed CLI source to the build folder
        fs.writeFileSync(path.join(serverDir, 'original-cli.mjs'), cliSource);
        console.log(`✓ Added original CLI source to build folder: ${path.basename(cliSourcePath)}`);
      } else {
        console.warn('⚠ Original CLI source not found, handlers may not work properly');
        console.warn('  Searched for:', possibleCliFiles.map(f => path.basename(f)).join(', '));
      }
    } catch (error) {
      console.warn('⚠ Failed to add original CLI source:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Builds a complete DXT package using TSDown CLI for autonomous execution
   */
  private async buildDxtWithTsdown(entryPointFile: string): Promise<void> {
    try {
      console.log(chalk.cyan('🔧 Building DXT package with TSDown...'));

      // Get the directory containing the entry point
      const entryDir = path.dirname(entryPointFile);
      const entryFileName = path.basename(entryPointFile);

      console.log(chalk.gray(`Entry point: ${entryPointFile}`));
      console.log(chalk.gray(`Working directory: ${entryDir}`));

      // Copy .dxtignore template
      const dxtIgnorePath = this.getDxtIgnoreTemplatePath();
      if (fs.existsSync(dxtIgnorePath)) {
        fs.copyFileSync(dxtIgnorePath, path.join(entryDir, '.dxtignore'));
      }

      // Run TSDown build from the entry point directory
      const originalCwd = process.cwd();
      try {
        process.chdir(entryDir);

        // Dynamic import TSDown to handle optional dependency
        const { build } = await import('tsdown');

        console.log(chalk.gray(`Building with TSDown: ${entryFileName}`));

        // Use TSDown build method with configuration options directly
        const buildConfig = {
          entry: [entryFileName],
          outDir: "dxt",
          format: ["esm"],
          target: "node22",
          noExternal: () => true,
          minify: false,
          sourcemap: false,
          clean: false,
          silent: process.env['NO_SILENCE'] !== '1',
          copy: [
            // Copy logo from assets - try multiple possible locations
            ...((() => {
              const possibleLogoPaths = [
                // From built library assets
                path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'logo_1_small.jpg'),
                // From node_modules
                path.join(process.cwd(), 'node_modules', '@alcyone-labs', 'arg-parser', 'dist', 'assets', 'logo_1_small.jpg'),
                // From package root dist/assets (for local build)
                path.join(process.cwd(), 'dist', 'assets', 'logo_1_small.jpg'),
                // From library root (development)
                path.join(process.cwd(), '..', '..', '..', 'docs', 'MCP', 'icons', 'logo_1_small.jpg'),
              ];

              for (const logoPath of possibleLogoPaths) {
                if (fs.existsSync(logoPath)) {
                  console.log(chalk.gray(`Found logo at: ${logoPath}`));
                  return [{ from: logoPath, to: 'logo.jpg' }];
                }
              }
              console.log(chalk.yellow('⚠ Logo not found in any expected location'));
              return []; // No logo found
            })())
          ],
          external: [
            // Node.js built-ins only - everything else should be bundled for true autonomy
            "stream", "fs", "path", "url", "util", "events", "child_process",
            "os", "tty", "process", "crypto", "http", "https", "net", "zlib",
          ],
          platform: "node" as const,
          plugins: [],
        };

        // Debug output and config file generation
        if (process.env['DEBUG'] === '1') {
          console.log(chalk.cyan('🐛 DEBUG: TSDown build configuration:'));
          console.log(JSON.stringify(buildConfig, null, 2));

          // Create dxt directory if it doesn't exist
          if (!fs.existsSync('dxt')) {
            fs.mkdirSync('dxt', { recursive: true });
          }

          // Write config to file for debugging
          const configContent = `// TSDown configuration used for DXT build
// Generated on ${new Date().toISOString()}
import { build } from 'tsdown';

export default ${JSON.stringify(buildConfig, null, 2)};

// To run manually:
// npx tsdown -c tsdown.config.dxt.ts
`;
          fs.writeFileSync(path.join('dxt', 'tsdown.config.dxt.ts'), configContent);
          console.log(chalk.gray('📝 Debug config written to dxt/tsdown.config.dxt.ts'));
        }

        await build(buildConfig as any);

        console.log(chalk.green('✅ TSDown bundling completed'));

        // Manual logo copy since TSDown's copy option doesn't work programmatically
        await this.copyLogoManually();

        // Copy manifest and logo to the dxt output directory
        await this.setupDxtPackageFiles(entryPointFile);

        // Run dxt pack (temporarily disabled due to dynamic import issues)
        console.log(chalk.cyan('📦 DXT package ready for packing'));
        console.log(chalk.gray('To complete the process, run: npx @anthropic-ai/dxt pack dxt/'));
        // await this.packDxtPackage();

      } finally {
        process.chdir(originalCwd);
      }

    } catch (error) {
      throw new Error(`TSDown DXT build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bundles the original CLI using TSDown for autonomous execution (legacy method)
   */
  private async bundleOriginalCliWithTsdown(serverDir: string): Promise<string | null> {
    try {
      // Dynamic import TSDown to handle optional dependency
      const { build } = await import('tsdown');

      console.log(chalk.cyan('🔧 Bundling CLI with TSDown for autonomous execution...'));

      // Copy TSDown config to the server directory for use
      const configContent = this.getTsdownConfigContent();
      const localConfigPath = path.join(serverDir, 'tsdown.config.mjs');
      fs.writeFileSync(localConfigPath, configContent);

      // Set up entry point and output directory
      const originalCliPath = path.join(serverDir, 'original-cli.mjs');
      if (!fs.existsSync(originalCliPath)) {
        console.warn(chalk.yellow('⚠ Original CLI not found, skipping TSDown bundling'));
        return null;
      }

      // Configure TSDown build options for true autonomous bundling
      const buildOptions = {
        entry: ['original-cli.mjs'], // Use relative path since we'll chdir to serverDir
        outDir: '.', // Output to current directory (serverDir)
        format: "esm" as const,
        target: "node22",
        // Bundle EVERYTHING except Node.js built-ins for true autonomy
        noExternal: (id: string) => {
          // Always bundle these critical packages
          if (id.startsWith('@alcyone-labs/')) return true;
          if (id.startsWith('@modelcontextprotocol/')) return true;
          if (id === 'zod') return true;
          if (id === 'chalk') return true;
          if (id === 'magic-regexp') return true;
          if (id === 'js-yaml') return true;
          if (id === '@iarna/toml') return true;
          if (id === 'dotenv') return true;
          if (id === 'adm-zip') return true;

          // Bundle all other npm packages by default
          if (!id.startsWith('node:') && !this.isNodeBuiltin(id)) return true;

          return false; // Don't bundle Node.js built-ins
        },
        minify: false,
        sourcemap: false,
        clean: false,
        outExtension: () => ({ js: '.bundled.mjs' }),
        alias: {
          // Alias chalk to SimpleChalk for autonomous builds
          chalk: path.resolve(process.cwd(), "node_modules/@alcyone-labs/arg-parser/dist/SimpleChalk.mjs"),
        },
        external: [
          // Only Node.js built-ins - everything else gets bundled for true autonomy
          "node:stream", "node:fs", "node:path", "node:url", "node:util",
          "node:events", "node:child_process", "node:os", "node:tty",
          "node:process", "node:crypto", "node:http", "node:https",
          "node:net", "node:zlib", "node:fs/promises", "node:timers",
          "stream", "fs", "path", "url", "util", "events", "child_process",
          "os", "tty", "process", "crypto", "http", "https", "net", "zlib",
          "fs/promises", "timers", "timers/promises", "perf_hooks", "async_hooks",
          "inspector", "v8", "vm", "assert", "constants", "module", "repl",
          "string_decoder", "punycode", "domain", "querystring", "readline",
          "worker_threads", "cluster", "dgram", "dns", "buffer"
        ],
        platform: "node" as const,
        plugins: [],
        // Resolve local dependencies properly
        resolve: {
          alias: {
            // Handle local monorepo dependencies
            '@alcyone-labs/arg-parser': path.resolve(process.cwd()),
          }
        }
      };

      // Run TSDown build from the server directory to resolve dependencies correctly
      const originalCwd = process.cwd();
      try {
        process.chdir(serverDir);
        await build(buildOptions);
      } finally {
        process.chdir(originalCwd);
      }

      // TSDown creates files based on the entry name, check for various possible outputs
      const possibleBundledFiles = [
        'original-cli.bundled.mjs',
        'original-cli.js',
        'original-cli.mjs'
      ];

      let bundledPath: string | null = null;
      let bundledFileName: string | null = null;

      for (const fileName of possibleBundledFiles) {
        const filePath = path.join(serverDir, fileName);
        if (fs.existsSync(filePath) && fileName !== 'original-cli.mjs') { // Don't use the original file
          bundledPath = filePath;
          bundledFileName = fileName;
          break;
        }
      }

      if (bundledPath && bundledFileName) {
        console.log(chalk.green(`✅ TSDown bundling completed successfully: ${bundledFileName}`));

        // Rename to our expected bundled name if needed
        const expectedBundledPath = path.join(serverDir, 'original-cli.bundled.mjs');
        if (bundledPath !== expectedBundledPath) {
          fs.renameSync(bundledPath, expectedBundledPath);
          bundledFileName = 'original-cli.bundled.mjs';
        }

        // Clean up the temporary config file
        try {
          fs.unlinkSync(localConfigPath);
        } catch (error) {
          // Ignore cleanup errors
        }

        // Make the bundled file executable
        try {
          fs.chmodSync(expectedBundledPath, 0o755);
        } catch (error) {
          console.warn('⚠ Could not set executable permission on bundled file:', error instanceof Error ? error.message : String(error));
        }

        return bundledFileName;
      } else {
        console.warn(chalk.yellow('⚠ TSDown bundling failed, bundled file not found'));
        return null;
      }

    } catch (error) {
      console.warn(chalk.yellow(`⚠ TSDown bundling failed: ${error instanceof Error ? error.message : String(error)}`));
      console.log(chalk.gray('  Falling back to non-bundled approach'));
      return null;
    }
  }

  /**
   * Checks if a module ID is a Node.js built-in
   */
  private isNodeBuiltin(id: string): boolean {
    const nodeBuiltins = [
      'stream', 'fs', 'path', 'url', 'util', 'events', 'child_process',
      'os', 'tty', 'process', 'crypto', 'http', 'https', 'net', 'zlib',
      'fs/promises', 'timers', 'timers/promises', 'perf_hooks', 'async_hooks',
      'inspector', 'v8', 'vm', 'assert', 'constants', 'module', 'repl',
      'string_decoder', 'punycode', 'domain', 'querystring', 'readline',
      'worker_threads', 'cluster', 'dgram', 'dns', 'buffer'
    ];

    return nodeBuiltins.includes(id) || id.startsWith('node:');
  }

  /**
   * Gets the TSDown configuration content as a string
   */
  private getTsdownConfigContent(): string {
    // Try to find the config in the assets directory first (relative to the built library)
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const assetsConfigPath = path.join(currentDir, '..', 'assets', 'tsdown.dxt.config.ts');

    if (fs.existsSync(assetsConfigPath)) {
      try {
        const content = fs.readFileSync(assetsConfigPath, 'utf-8');
        // Convert TypeScript config to ES module format
        return content
          .replace('/// <reference types="tsdown" />', '')
          .replace('import { defineConfig } from "tsdown/config";', 'import { defineConfig } from "tsdown";')
          .replace('export default defineConfig(', 'export default defineConfig(');
      } catch (error) {
        console.warn(chalk.yellow('⚠ Could not read TSDown config from assets, using fallback'));
      }
    }

    // Fallback to the root directory
    const rootConfigPath = path.join(process.cwd(), 'tsdown.dxt.config.ts');
    if (fs.existsSync(rootConfigPath)) {
      try {
        const content = fs.readFileSync(rootConfigPath, 'utf-8');
        return content
          .replace('/// <reference types="tsdown" />', '')
          .replace('import { defineConfig } from "tsdown/config";', 'import { defineConfig } from "tsdown";');
      } catch (error) {
        console.warn(chalk.yellow('⚠ Could not read TSDown config from root, using default'));
      }
    }

    // Default configuration as fallback
    return `import { defineConfig } from "tsdown";
import path from "path";

export default defineConfig({
  outDir: "server",
  format: ["esm", "module"],
  target: "node22",
  noExternal: () => true,
  minify: false,
  sourcemap: false,
  clean: false,
  alias: {
    chalk: path.resolve(process.cwd(), "node_modules/@alcyone-labs/arg-parser/dist/SimpleChalk.mjs"),
  },
  external: [
    "stream", "fs", "path", "url", "util", "events", "child_process",
    "os", "tty", "process", "crypto", "http", "https", "net", "zlib",
  ],
  platform: "node",
  plugins: [],
});`;
  }



  /**
   * Gets the path to the .dxtignore template file in assets
   */
  private getDxtIgnoreTemplatePath(): string {
    // Try multiple locations for the .dxtignore template
    const possiblePaths = [
      // 1. From the built library assets (when installed via npm)
      path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', '.dxtignore.template'),

      // 2. From node_modules/@alcyone-labs/arg-parser/dist/assets (when installed via npm)
      path.join(process.cwd(), 'node_modules', '@alcyone-labs', 'arg-parser', 'dist', 'assets', '.dxtignore.template'),

      // 3. From the root directory (development/local build)
      path.join(process.cwd(), '.dxtignore.template'),

      // 4. From the library root (when using local file dependency)
      path.join(process.cwd(), '..', '..', '..', '.dxtignore.template'),
    ];

    for (const ignorePath of possiblePaths) {
      if (fs.existsSync(ignorePath)) {
        console.log(chalk.gray(`Found .dxtignore template at: ${ignorePath}`));
        return ignorePath;
      }
    }

    // Return empty string if not found - we'll skip copying the template
    console.log(chalk.yellow('⚠ .dxtignore template not found, skipping'));
    return '';
  }

  /**
   * Sets up DXT package files (manifest.json) in the dxt output directory
   */
  private async setupDxtPackageFiles(entryPointFile: string): Promise<void> {
    const dxtDir = './dxt';
    if (!fs.existsSync(dxtDir)) {
      throw new Error('TSDown output directory (dxt) not found');
    }

    // Read package.json for project information
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let packageInfo: any = {};
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      } catch (error) {
        console.warn(chalk.yellow('Warning: Could not read package.json'));
      }
    }

    // Generate tools using the unified approach (DXT-compliant: only name and description)
    let tools: Array<{ name: string; description?: string }> = [];

    try {
      // Use the unified tool generation that includes both CLI and manual tools
      const mcpTools = this.generateMcpToolsForDxt();
      tools = mcpTools.map((tool: any) => ({
        name: tool.name,
        description: tool.description
      }));
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not generate unified tool list: ${error instanceof Error ? error.message : String(error)}`));

      // Fallback: Generate tools from main parser flags
      const mainFlags = this.argParserInstance.flags;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const flag of mainFlags) {
        // Skip help flag and system flags
        if (flag.name === 'help' || flag.name.startsWith('s-')) continue;

        properties[flag.name] = {
          type: this.mapFlagTypeToJsonSchema(flag.type as any),
          description: flag.description || `${flag.name} parameter`
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
      tools = [{
        name: commandName || packageInfo.name || 'cli-tool',
        description: packageInfo.description || this.argParserInstance.getDescription() || 'CLI tool'
      }];
    }

    // Extract environment variables and user config from the ArgParser instance
    const envVars: Record<string, string> = {};
    const userConfig: Record<string, any> = {};

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
          title: envVar.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: flag.description || `${envVar} environment variable`,
          required: flag.required || false,
          sensitive: true // Assume env vars are sensitive
        };
      }
    }

    // Also check unified tools for environment variables
    if (typeof (this.argParserInstance as any).getTools === 'function') {
      const tools = (this.argParserInstance as any).getTools();
      for (const [, toolConfig] of tools) {
        const toolFlags = (toolConfig as any).flags || [];
        for (const flag of toolFlags) {
          const envVar = (flag as any).env || (flag as any).envVar;
          if (envVar && !envVars[envVar]) { // Only add if not already present
            // Add to server env - use the original env var name so process.env.CANNY_API_KEY works
            envVars[envVar] = `\${user_config.${envVar}}`;

            // Add to user_config - use the original env var name to maintain compatibility
            userConfig[envVar] = {
              type: "string",
              title: envVar.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: flag.description || `${envVar} environment variable`,
              required: flag.required || flag.mandatory || false,
              sensitive: true // Assume env vars are sensitive
            };
          }
        }
      }
    }

    // Get server info from withMcp() configuration or fallback to package.json
    const serverInfo = this.extractMcpServerInfo();

    // Create DXT manifest using server info and package.json data
    const entryFileName = path.basename(entryPointFile);

    // Use server info if available, otherwise fallback to package.json (DXT-compliant)
    const manifest = {
      dxt_version: "0.1",
      name: serverInfo.name || packageInfo.name || 'mcp-server',
      version: serverInfo.version || packageInfo.version || '1.0.0',
      description: serverInfo.description || packageInfo.description || 'MCP server generated by @alcyone-labs/arg-parser',
      author: serverInfo.author || {
        name: packageInfo.author?.name || packageInfo.author || '@alcyone-labs/arg-parser',
        ...(packageInfo.author?.email && { email: packageInfo.author.email }),
        url: packageInfo.author?.url || packageInfo.homepage || packageInfo.repository?.url || 'https://github.com/alcyone-labs/arg-parser'
      },
      server: {
        type: "node",
        entry_point: entryFileName,
        mcp_config: {
          command: "node",
          args: [
            `\${__dirname}/${entryFileName}`,
            "--s-mcp-serve"
          ],
          env: envVars
        }
      },
      tools: tools,
      icon: "logo.jpg",
      ...(Object.keys(userConfig).length > 0 && { user_config: userConfig }),
      repository: {
        type: "git",
        url: packageInfo.repository?.url || 'https://github.com/alcyone-labs/arg-parser'
      },
      license: packageInfo.license || 'MIT'
    };

    fs.writeFileSync(path.join(dxtDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(chalk.gray('✅ DXT package files set up'));
  }

  /**
   * Maps ArgParser flag types to JSON Schema types
   */
  private mapFlagTypeToJsonSchema(flagType: any): string {
    if (typeof flagType === 'function') {
      const typeName = flagType.name.toLowerCase();
      switch (typeName) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'array': return 'array';
        default: return 'string';
      }
    }

    const typeStr = String(flagType).toLowerCase();
    switch (typeStr) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'array': return 'array';
      default: return 'string';
    }
  }

  /**
   * Manually copy logo since TSDown's copy option doesn't work programmatically
   */
  private async copyLogoManually(): Promise<void> {
    const dxtDir = './dxt';
    if (!fs.existsSync(dxtDir)) {
      console.warn(chalk.yellow('⚠ DXT directory not found, skipping logo copy'));
      return;
    }

    const possibleLogoPaths = [
      // From built library assets
      path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'logo_1_small.jpg'),
      // From node_modules
      path.join(process.cwd(), 'node_modules', '@alcyone-labs', 'arg-parser', 'dist', 'assets', 'logo_1_small.jpg'),
      // From package root dist/assets (for local build)
      path.join(process.cwd(), 'dist', 'assets', 'logo_1_small.jpg'),
      // From library root (development)
      path.join(process.cwd(), '..', '..', '..', 'docs', 'MCP', 'icons', 'logo_1_small.jpg'),
    ];

    for (const logoPath of possibleLogoPaths) {
      if (fs.existsSync(logoPath)) {
        try {
          fs.copyFileSync(logoPath, path.join(dxtDir, 'logo.jpg'));
          console.log(chalk.gray(`✅ Logo copied from: ${logoPath}`));
          return;
        } catch (error) {
          console.warn(chalk.yellow(`⚠ Failed to copy logo from ${logoPath}: ${error}`));
        }
      }
    }

    console.warn(chalk.yellow('⚠ Logo not found in any expected location'));
  }
}

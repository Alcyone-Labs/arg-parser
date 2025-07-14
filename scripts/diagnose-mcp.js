#!/usr/bin/env node

/**
 * MCP Server Diagnostic Script
 * 
 * This script helps diagnose issues with MCP server integration,
 * particularly for Claude Desktop integration.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync, accessSync, constants } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class McpDiagnostic {
  constructor(serverPath, manifestPath) {
    this.serverPath = resolve(serverPath);
    this.manifestPath = manifestPath ? resolve(manifestPath) : null;
    this.issues = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addIssue(message) {
    this.issues.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  checkFileExists(filePath, description) {
    if (!existsSync(filePath)) {
      this.addIssue(`${description} not found: ${filePath}`);
      return false;
    }
    this.log(`${description} exists: ${filePath}`);
    return true;
  }

  checkFilePermissions(filePath, description) {
    try {
      accessSync(filePath, constants.R_OK);
      this.log(`${description} is readable`);
      
      try {
        accessSync(filePath, constants.X_OK);
        this.log(`${description} is executable`);
      } catch (error) {
        this.addWarning(`${description} is not executable - this might cause issues`);
      }
    } catch (error) {
      this.addIssue(`${description} is not readable: ${error.message}`);
    }
  }

  checkManifest() {
    if (!this.manifestPath) {
      this.addWarning('No manifest path provided - skipping manifest validation');
      return;
    }

    if (!this.checkFileExists(this.manifestPath, 'Manifest file')) {
      return;
    }

    try {
      const manifestContent = readFileSync(this.manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      
      this.log('Manifest parsed successfully');
      
      // Check required fields
      const requiredFields = ['dxt_version', 'name', 'version', 'server'];
      for (const field of requiredFields) {
        if (!manifest[field]) {
          this.addIssue(`Manifest missing required field: ${field}`);
        }
      }

      // Check server configuration
      if (manifest.server) {
        if (!manifest.server.entry_point) {
          this.addIssue('Manifest missing server.entry_point');
        } else {
          this.log(`Entry point: ${manifest.server.entry_point}`);
        }

        if (!manifest.server.mcp_config) {
          this.addIssue('Manifest missing server.mcp_config');
        } else {
          const mcpConfig = manifest.server.mcp_config;
          this.log(`MCP command: ${mcpConfig.command}`);
          this.log(`MCP args: ${JSON.stringify(mcpConfig.args)}`);
        }
      }

      this.log(`Manifest validation completed`);
    } catch (error) {
      this.addIssue(`Failed to parse manifest: ${error.message}`);
    }
  }

  async testServerStartup() {
    this.log('Testing server startup...');
    
    return new Promise((resolve) => {
      const process = spawn('node', [this.serverPath, 'serve'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let startupSuccessful = false;

      const timeout = setTimeout(() => {
        process.kill();
        if (!startupSuccessful) {
          this.addIssue('Server startup timeout (10 seconds)');
        }
        resolve(startupSuccessful);
      }, 10000);

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        const stderrData = data.toString();
        stderr += stderrData;
        
        if (stderrData.includes('MCP Server started') || stderrData.includes('All MCP transports started')) {
          startupSuccessful = true;
          this.log('Server startup successful');
          clearTimeout(timeout);
          process.kill();
          resolve(true);
        }
      });

      process.on('error', (error) => {
        this.addIssue(`Server startup error: ${error.message}`);
        clearTimeout(timeout);
        resolve(false);
      });

      process.on('exit', (code) => {
        if (code !== 0 && !startupSuccessful) {
          this.addIssue(`Server exited with code ${code}`);
          if (stderr) {
            this.log(`Server stderr: ${stderr}`);
          }
          if (stdout) {
            this.log(`Server stdout: ${stdout}`);
          }
        }
        clearTimeout(timeout);
        resolve(startupSuccessful);
      });
    });
  }

  async testMcpProtocol() {
    this.log('Testing MCP protocol compliance...');
    
    return new Promise((resolve) => {
      const process = spawn('node', [this.serverPath, 'serve'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let protocolWorking = false;
      let buffer = '';

      const timeout = setTimeout(() => {
        process.kill();
        if (!protocolWorking) {
          this.addIssue('MCP protocol test timeout');
        }
        resolve(protocolWorking);
      }, 15000);

      process.stdout?.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              if (message.result && message.result.protocolVersion) {
                this.log('MCP protocol response received successfully');
                protocolWorking = true;
                clearTimeout(timeout);
                process.kill();
                resolve(true);
              }
            } catch (error) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }
      });

      process.stderr?.on('data', (data) => {
        const stderr = data.toString();
        if (stderr.includes('MCP Server started')) {
          // Send initialize request
          const initRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: {
                name: "diagnostic-client",
                version: "1.0.0"
              }
            }
          };
          
          process.stdin?.write(JSON.stringify(initRequest) + '\n');
        }
      });

      process.on('error', (error) => {
        this.addIssue(`MCP protocol test error: ${error.message}`);
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async runDiagnostics() {
    this.log('Starting MCP Server Diagnostics...');
    this.log(`Server path: ${this.serverPath}`);
    if (this.manifestPath) {
      this.log(`Manifest path: ${this.manifestPath}`);
    }

    // Check file existence and permissions
    if (this.checkFileExists(this.serverPath, 'Server file')) {
      this.checkFilePermissions(this.serverPath, 'Server file');
    }

    // Check manifest
    this.checkManifest();

    // Test server startup
    const startupSuccess = await this.testServerStartup();
    
    // Test MCP protocol if startup was successful
    if (startupSuccess) {
      await this.testMcpProtocol();
    }

    // Summary
    this.log('\n=== DIAGNOSTIC SUMMARY ===');
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      this.log('✅ All checks passed! Server should work with Claude Desktop.');
    } else {
      if (this.issues.length > 0) {
        this.log(`❌ Found ${this.issues.length} issue(s):`);
        this.issues.forEach((issue, i) => {
          this.log(`   ${i + 1}. ${issue}`);
        });
      }
      
      if (this.warnings.length > 0) {
        this.log(`⚠️ Found ${this.warnings.length} warning(s):`);
        this.warnings.forEach((warning, i) => {
          this.log(`   ${i + 1}. ${warning}`);
        });
      }
    }

    return {
      success: this.issues.length === 0,
      issues: this.issues,
      warnings: this.warnings
    };
  }
}

// CLI usage
if (process.argv.length < 3) {
  console.log('Usage: node diagnose-mcp.js <server-path> [manifest-path]');
  console.log('');
  console.log('Examples:');
  console.log('  node diagnose-mcp.js ./server/index.cjs');
  console.log('  node diagnose-mcp.js ./server/index.cjs ./manifest.json');
  process.exit(1);
}

const serverPath = process.argv[2];
const manifestPath = process.argv[3];

const diagnostic = new McpDiagnostic(serverPath, manifestPath);
diagnostic.runDiagnostics().then((result) => {
  process.exit(result.success ? 0 : 1);
}).catch((error) => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});

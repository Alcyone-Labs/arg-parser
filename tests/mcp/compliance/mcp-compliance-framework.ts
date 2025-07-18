/**
 * MCP Compliance Testing Framework
 *
 * This module provides utilities and validators for comprehensive MCP specification compliance testing.
 * It ensures that MCP servers strictly adhere to the official MCP protocol requirements.
 */

import {
  ALL_MCP_VERSIONS,
  CURRENT_MCP_PROTOCOL_VERSION,
  DEFAULT_MCP_PROTOCOL_VERSION,
  isAnyMcpVersion,
  isValidMcpVersionFormat,
  MCP_PROTOCOL_VERSIONS,
  negotiateProtocolVersion,
} from "../../../src/mcp/mcp-protocol-versions";

/**
 * MCP compliance test result
 */
export interface McpComplianceResult {
  passed: boolean;
  message: string;
  details?: any;
  severity: "error" | "warning" | "info";
}

/**
 * MCP compliance test suite configuration
 */
export interface McpComplianceConfig {
  /** Expected server name pattern */
  expectedServerNamePattern?: RegExp;
  /** Expected minimum capabilities */
  requiredCapabilities?: string[];
  /** Expected tools (if any) */
  expectedTools?: string[];
  /** Timeout for requests in milliseconds */
  requestTimeout?: number;
  /** Whether to test version negotiation edge cases */
  testVersionEdgeCases?: boolean;
  /** Whether to test error handling */
  testErrorHandling?: boolean;
}

/**
 * Default compliance configuration
 */
export const DEFAULT_COMPLIANCE_CONFIG: McpComplianceConfig = {
  requestTimeout: 5000,
  testVersionEdgeCases: true,
  testErrorHandling: true,
  requiredCapabilities: ["tools"],
};

/**
 * MCP Protocol Compliance Validator
 */
export class McpComplianceValidator {
  private config: McpComplianceConfig;
  private results: McpComplianceResult[] = [];

  constructor(config: McpComplianceConfig = DEFAULT_COMPLIANCE_CONFIG) {
    this.config = { ...DEFAULT_COMPLIANCE_CONFIG, ...config };
  }

  /**
   * Add a compliance test result
   */
  private addResult(result: McpComplianceResult): void {
    this.results.push(result);
  }

  /**
   * Get all compliance test results
   */
  public getResults(): McpComplianceResult[] {
    return [...this.results];
  }

  /**
   * Get summary of compliance results
   */
  public getSummary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const errors = this.results.filter(
      (r) => r.severity === "error" && !r.passed,
    ).length;
    const warnings = this.results.filter(
      (r) => r.severity === "warning" && !r.passed,
    ).length;

    return {
      total,
      passed,
      failed: total - passed,
      errors,
      warnings,
      passRate: total > 0 ? (passed / total) * 100 : 0,
    };
  }

  /**
   * Clear all results
   */
  public clearResults(): void {
    this.results = [];
  }

  /**
   * Validate initialization response structure
   */
  public validateInitializationResponse(response: any): McpComplianceResult[] {
    const results: McpComplianceResult[] = [];

    // Clear previous results and add new ones
    this.clearResults();

    // JSON-RPC 2.0 compliance
    if (response.jsonrpc !== "2.0") {
      results.push({
        passed: false,
        message: 'Response must include "jsonrpc": "2.0"',
        details: { actual: response.jsonrpc },
        severity: "error",
      });
    } else {
      results.push({
        passed: true,
        message: "JSON-RPC 2.0 field present",
        severity: "info",
      });
    }

    // ID field presence
    if (response.id === undefined) {
      results.push({
        passed: false,
        message: "Response must include id field",
        severity: "error",
      });
    } else {
      results.push({
        passed: true,
        message: "Response ID field present",
        severity: "info",
      });
    }

    // Result field presence
    if (!response.result) {
      results.push({
        passed: false,
        message: "Initialize response must include result field",
        severity: "error",
      });
      return results; // Can't continue validation without result
    }

    // Protocol version validation
    const protocolVersion = response.result.protocolVersion;
    if (!protocolVersion) {
      results.push({
        passed: false,
        message: "Initialize response must include protocolVersion",
        severity: "error",
      });
    } else if (!isValidMcpVersionFormat(protocolVersion)) {
      results.push({
        passed: false,
        message: "Protocol version must follow YYYY-MM-DD format",
        details: { actual: protocolVersion },
        severity: "error",
      });
    } else {
      results.push({
        passed: true,
        message: "Protocol version format valid",
        details: { version: protocolVersion },
        severity: "info",
      });
    }

    // Server info validation
    const serverInfo = response.result.serverInfo;
    if (!serverInfo) {
      results.push({
        passed: false,
        message: "Initialize response must include serverInfo",
        severity: "error",
      });
    } else {
      if (!serverInfo.name) {
        results.push({
          passed: false,
          message: "Server info must include name",
          severity: "error",
        });
      }
      if (!serverInfo.version) {
        results.push({
          passed: false,
          message: "Server info must include version",
          severity: "error",
        });
      }
      if (serverInfo.name && serverInfo.version) {
        results.push({
          passed: true,
          message: "Server info complete",
          details: { name: serverInfo.name, version: serverInfo.version },
          severity: "info",
        });
      }
    }

    // Capabilities validation
    const capabilities = response.result.capabilities;
    if (!capabilities) {
      results.push({
        passed: false,
        message: "Initialize response must include capabilities",
        severity: "error",
      });
    } else {
      results.push({
        passed: true,
        message: "Capabilities field present",
        details: { capabilities: Object.keys(capabilities) },
        severity: "info",
      });

      // Check required capabilities
      if (this.config.requiredCapabilities) {
        for (const requiredCap of this.config.requiredCapabilities) {
          if (!capabilities[requiredCap]) {
            results.push({
              passed: false,
              message: `Required capability '${requiredCap}' not declared`,
              severity: "error",
            });
          } else {
            results.push({
              passed: true,
              message: `Required capability '${requiredCap}' declared`,
              severity: "info",
            });
          }
        }
      }
    }

    // Add all results to the validator's internal tracking
    results.forEach((result) => this.addResult(result));

    return results;
  }

  /**
   * Validate version negotiation behavior
   */
  public validateVersionNegotiation(
    requestedVersion: string,
    responseVersion: string,
  ): McpComplianceResult[] {
    const results: McpComplianceResult[] = [];

    // Check if response version is valid format
    if (!isValidMcpVersionFormat(responseVersion)) {
      results.push({
        passed: false,
        message: "Response protocol version must follow YYYY-MM-DD format",
        details: { requested: requestedVersion, response: responseVersion },
        severity: "error",
      });
      return results;
    }

    // Check negotiation logic
    const expectedVersion = negotiateProtocolVersion(requestedVersion);

    if (isAnyMcpVersion(requestedVersion)) {
      // If client requests any known MCP version (stable or draft)
      if (responseVersion === requestedVersion) {
        results.push({
          passed: true,
          message:
            "Server correctly returned same version for known MCP version request",
          details: { version: responseVersion },
          severity: "info",
        });
      } else if (isAnyMcpVersion(responseVersion)) {
        results.push({
          passed: true,
          message: "Server negotiated to different but valid MCP version",
          details: { requested: requestedVersion, negotiated: responseVersion },
          severity: "info",
        });
      } else {
        results.push({
          passed: false,
          message: "Server returned non-MCP version",
          details: { requested: requestedVersion, response: responseVersion },
          severity: "error",
        });
      }
    } else {
      // If client requests unsupported/invalid version, server MUST respond with supported version
      if (responseVersion === requestedVersion) {
        results.push({
          passed: false,
          message: "Server should not return unsupported/invalid version",
          details: { requested: requestedVersion, response: responseVersion },
          severity: "error",
        });
      } else if (isAnyMcpVersion(responseVersion)) {
        results.push({
          passed: true,
          message:
            "Server correctly negotiated to supported version for invalid request",
          details: { requested: requestedVersion, negotiated: responseVersion },
          severity: "info",
        });
      } else {
        results.push({
          passed: false,
          message: "Server returned invalid version during negotiation",
          details: { requested: requestedVersion, actual: responseVersion },
          severity: "error",
        });
      }
    }

    // Add all results to the validator's internal tracking
    results.forEach((result) => this.addResult(result));

    return results;
  }

  /**
   * Validate tools list response
   */
  public validateToolsListResponse(response: any): McpComplianceResult[] {
    const results: McpComplianceResult[] = [];

    // Basic JSON-RPC validation
    if (response.jsonrpc !== "2.0") {
      results.push({
        passed: false,
        message: 'Tools list response must include "jsonrpc": "2.0"',
        severity: "error",
      });
    }

    if (!response.result) {
      results.push({
        passed: false,
        message: "Tools list response must include result field",
        severity: "error",
      });
      return results;
    }

    // Tools array validation
    const tools = response.result.tools;
    if (!Array.isArray(tools)) {
      results.push({
        passed: false,
        message: "Tools list result must contain tools array",
        severity: "error",
      });
      return results;
    }

    results.push({
      passed: true,
      message: `Tools list contains ${tools.length} tools`,
      details: { toolCount: tools.length },
      severity: "info",
    });

    // Validate each tool
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const toolResults = this.validateToolDefinition(tool, i);
      results.push(...toolResults);
    }

    // Check expected tools
    if (this.config.expectedTools) {
      const toolNames = tools.map((t: any) => t.name);
      for (const expectedTool of this.config.expectedTools) {
        if (!toolNames.includes(expectedTool)) {
          results.push({
            passed: false,
            message: `Expected tool '${expectedTool}' not found`,
            severity: "error",
          });
        } else {
          results.push({
            passed: true,
            message: `Expected tool '${expectedTool}' found`,
            severity: "info",
          });
        }
      }
    }

    // Add all results to the validator's internal tracking
    results.forEach((result) => this.addResult(result));

    return results;
  }

  /**
   * Validate individual tool definition
   */
  private validateToolDefinition(
    tool: any,
    index: number,
  ): McpComplianceResult[] {
    const results: McpComplianceResult[] = [];
    const toolId = tool.name || `tool[${index}]`;

    // Name validation
    if (!tool.name || typeof tool.name !== "string") {
      results.push({
        passed: false,
        message: `Tool ${toolId} must have a string name`,
        severity: "error",
      });
    }

    // Description validation (optional but recommended)
    if (tool.description && typeof tool.description !== "string") {
      results.push({
        passed: false,
        message: `Tool ${toolId} description must be a string if provided`,
        severity: "warning",
      });
    }

    // Input schema validation
    if (!tool.inputSchema) {
      results.push({
        passed: false,
        message: `Tool ${toolId} must have inputSchema`,
        severity: "error",
      });
    } else if (typeof tool.inputSchema !== "object") {
      results.push({
        passed: false,
        message: `Tool ${toolId} inputSchema must be an object`,
        severity: "error",
      });
    } else {
      results.push({
        passed: true,
        message: `Tool ${toolId} has valid inputSchema`,
        severity: "info",
      });
    }

    return results;
  }
}

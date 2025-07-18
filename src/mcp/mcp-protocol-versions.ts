/**
 * MCP Protocol Version Configuration
 *
 * This module defines the supported MCP protocol versions and provides
 * utilities for version negotiation according to the MCP specification.
 *
 * Version Negotiation Rules (per MCP specification):
 * 1. If server supports the requested protocol version, it MUST respond with the same version
 * 2. Otherwise, server MUST respond with another protocol version it supports
 * 3. Server SHOULD respond with the latest version it supports
 * 4. If client doesn't support the server's response version, it SHOULD disconnect
 */

/**
 * Official MCP protocol versions in chronological order
 * Based on the official MCP specification releases found in docs/MCP/modelcontextprotocol/docs/specification/
 *
 * According to versioning.mdx:
 * - 2025-06-18 is the **current** protocol version
 * - Previous versions are marked as **final** (complete, no changes)
 * - Draft versions are in-progress specifications
 */
export const MCP_PROTOCOL_VERSIONS = [
  "2024-11-05", // Final - Initial stable release
  "2025-03-26", // Final - Updated transport specifications
  "2025-06-18", // Current - Latest stable specification
] as const;

/**
 * Draft protocol versions (in-progress specifications)
 * These are not yet ready for production use
 */
export const MCP_DRAFT_VERSIONS = [
  "draft", // Draft - In-progress specification
] as const;

/**
 * All available protocol versions (stable + draft)
 */
export const ALL_MCP_VERSIONS = [
  ...MCP_PROTOCOL_VERSIONS,
  ...MCP_DRAFT_VERSIONS,
] as const;

/**
 * Type for stable MCP protocol versions
 */
export type McpProtocolVersion = (typeof MCP_PROTOCOL_VERSIONS)[number];

/**
 * Type for draft MCP protocol versions
 */
export type McpDraftVersion = (typeof MCP_DRAFT_VERSIONS)[number];

/**
 * Type for all MCP protocol versions (stable + draft)
 */
export type McpAnyVersion = (typeof ALL_MCP_VERSIONS)[number];

/**
 * Current protocol version according to the official MCP specification
 * This is marked as "current" in versioning.mdx and should be the preferred version
 */
export const CURRENT_MCP_PROTOCOL_VERSION: McpProtocolVersion = "2025-06-18";

/**
 * Default protocol version used by this implementation for backward compatibility
 * We start with this version but can negotiate to newer versions
 *
 * Note: The official MCP SDK may support newer versions automatically.
 * This constant represents our fallback/minimum version.
 */
export const DEFAULT_MCP_PROTOCOL_VERSION: McpProtocolVersion = "2024-11-05";

/**
 * Latest stable protocol version (highest version number from stable versions)
 */
export const LATEST_MCP_PROTOCOL_VERSION: McpProtocolVersion =
  MCP_PROTOCOL_VERSIONS[MCP_PROTOCOL_VERSIONS.length - 1];

/**
 * Minimum supported protocol version (oldest stable version)
 */
export const MINIMUM_MCP_PROTOCOL_VERSION: McpProtocolVersion =
  MCP_PROTOCOL_VERSIONS[0];

/**
 * Validates if a protocol version string follows the MCP format (YYYY-MM-DD or 'draft')
 */
export function isValidMcpVersionFormat(version: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(version) || version === "draft";
}

/**
 * Checks if a protocol version is an official stable MCP version
 */
export function isOfficialMcpVersion(
  version: string,
): version is McpProtocolVersion {
  return MCP_PROTOCOL_VERSIONS.includes(version as McpProtocolVersion);
}

/**
 * Checks if a protocol version is a draft MCP version
 */
export function isDraftMcpVersion(version: string): version is McpDraftVersion {
  return MCP_DRAFT_VERSIONS.includes(version as McpDraftVersion);
}

/**
 * Checks if a protocol version is any valid MCP version (stable or draft)
 */
export function isAnyMcpVersion(version: string): version is McpAnyVersion {
  return ALL_MCP_VERSIONS.includes(version as McpAnyVersion);
}

/**
 * Checks if a protocol version is supported by this implementation
 * Note: The official MCP SDK may support additional versions automatically
 */
export function isSupportedByImplementation(version: string): boolean {
  // We support all official stable versions and can handle draft versions
  // The official SDK likely supports all of these automatically
  return isAnyMcpVersion(version);
}

/**
 * Checks if a protocol version is recommended for production use
 */
export function isProductionReady(version: string): boolean {
  // Only stable versions are recommended for production
  return isOfficialMcpVersion(version);
}

/**
 * Performs version negotiation according to MCP specification
 *
 * @param requestedVersion The protocol version requested by the client
 * @returns The protocol version the server should respond with
 *
 * According to MCP specification:
 * - If server supports requested version → return SAME version (MUST)
 * - If server doesn't support requested version → return different supported version (MUST)
 * - Server SHOULD return latest version it supports
 *
 * Note: The actual MCP SDK may implement its own version negotiation.
 */
export function negotiateProtocolVersion(
  requestedVersion: string,
): McpAnyVersion {
  // Validate format first
  if (!isValidMcpVersionFormat(requestedVersion)) {
    // If format is invalid, return the current/latest stable version
    return CURRENT_MCP_PROTOCOL_VERSION;
  }

  // If we support the requested version, return it (MUST per spec)
  if (isSupportedByImplementation(requestedVersion)) {
    // For draft versions, we might want to negotiate to stable version in production
    if (isDraftMcpVersion(requestedVersion)) {
      // In production, prefer stable version over draft
      return CURRENT_MCP_PROTOCOL_VERSION;
    }
    return requestedVersion as McpAnyVersion;
  }

  // If we don't support the requested version, return our current/latest version (SHOULD per spec)
  return CURRENT_MCP_PROTOCOL_VERSION;
}

/**
 * Gets comprehensive version compatibility information
 */
export function getVersionCompatibilityInfo() {
  return {
    // Stable versions
    stableVersions: [...MCP_PROTOCOL_VERSIONS],
    currentVersion: CURRENT_MCP_PROTOCOL_VERSION,
    defaultVersion: DEFAULT_MCP_PROTOCOL_VERSION,
    latestStableVersion: LATEST_MCP_PROTOCOL_VERSION,
    minimumVersion: MINIMUM_MCP_PROTOCOL_VERSION,

    // Draft versions
    draftVersions: [...MCP_DRAFT_VERSIONS],

    // All versions
    allSupportedVersions: [...ALL_MCP_VERSIONS],

    // Version status
    versionStatus: {
      "2024-11-05": "final",
      "2025-03-26": "final",
      "2025-06-18": "current",
      draft: "draft",
    },
  };
}

/**
 * Compares two MCP protocol versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (v1 === v2) return 0;
  return v1 < v2 ? -1 : 1;
}

/**
 * Finds the highest version from a list of versions
 */
export function getHighestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;

  return versions.reduce((highest, current) => {
    return compareVersions(current, highest) > 0 ? current : highest;
  });
}

/**
 * Comprehensive test data for version negotiation testing
 */
export const VERSION_TEST_DATA = {
  // All supported stable versions
  stableVersions: [...MCP_PROTOCOL_VERSIONS],

  // Draft versions (may not be suitable for production)
  draftVersions: [...MCP_DRAFT_VERSIONS],

  // All supported versions
  allSupportedVersions: [...ALL_MCP_VERSIONS],

  // Versions that should be rejected/negotiated
  unsupportedVersions: [
    "2020-01-01", // Too old (before MCP existed)
    "2023-01-01", // Before first official release
    "2024-01-01", // Before first official release
    "2030-12-31", // Future version
    "2026-01-01", // Future version
  ],

  // Malformed version strings
  malformedVersions: [
    "", // Empty string
    "invalid", // Non-date format
    "2024", // Incomplete date
    "2024-13-01", // Invalid month
    "2024-01-32", // Invalid day
    "v2024-11-05", // With prefix
    "2024.11.05", // Wrong separator
    "24-11-05", // Wrong year format
    "2024-11-5", // Wrong day format
    "beta", // Invalid draft name
    "v1.0.0", // Semantic versioning format
  ],

  // Expected negotiation results for testing
  expectedNegotiations: {
    "2024-11-05": "2024-11-05", // Should return same
    "2025-03-26": "2025-03-26", // Should return same
    "2025-06-18": "2025-06-18", // Should return same (current)
    draft: "2025-06-18", // Should negotiate to stable
    "2020-01-01": "2025-06-18", // Should negotiate to current
    "2030-12-31": "2025-06-18", // Should negotiate to current
    invalid: "2025-06-18", // Should negotiate to current
  },
} as const;

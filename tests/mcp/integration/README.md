# MCP Integration Testing

This directory contains comprehensive integration tests for the MCP (Model Context Protocol) functionality in the arg-parser library. These tests verify that MCP servers generated from ArgParser instances work correctly in real-world scenarios and comply with the MCP protocol specification.

## Overview

The integration tests are designed to:

- **Validate Protocol Compliance**: Ensure generated MCP servers follow the MCP specification
- **Test Real-World Scenarios**: Verify functionality with practical use cases
- **Performance Testing**: Measure response times and resource usage
- **Error Handling**: Validate graceful error handling and recovery
- **Multi-Transport Support**: Test different transport mechanisms (stdio, SSE, HTTP)

## Test Structure

### Test Suites

| Suite | File | Description | Critical |
|-------|------|-------------|----------|
| **end-to-end** | `end-to-end.test.ts` | Basic MCP server functionality and tool execution | Critical |
| **protocol-compliance** | `protocol-compliance.test.ts` | MCP protocol specification compliance | Critical |
| **tool-execution** | `tool-execution.test.ts` | Comprehensive tool execution scenarios | Critical |
| **multi-transport** | `multi-transport.test.ts` | Multiple transport type testing | Non-Critical |
| **real-world-examples** | `real-world-examples.test.ts` | Practical usage examples | Non-Critical |
| **performance** | `performance.test.ts` | Performance and reliability testing | Non-Critical |

**Legend:**
- Critical: Must pass for release
- Non-Critical: Important but not blocking

### Utilities

- **`mcp-client-utils.ts`**: MCP client implementations for testing
- **`run-integration-tests.ts`**: Test runner with reporting
- **`../examples/`**: Real-world MCP server examples

## Running Tests

### Quick Start

```bash
# Run all integration tests
pnpm test:mcp

# Run with verbose output
pnpm test:mcp:verbose

# Run specific test suite
pnpm test:mcp:e2e
pnpm test:mcp:compliance
pnpm test:mcp:performance
```

### Individual Test Suites

```bash
# End-to-end tests
vitest run tests/mcp/integration/end-to-end.test.ts

# Protocol compliance
vitest run tests/mcp/integration/protocol-compliance.test.ts

# Tool execution
vitest run tests/mcp/integration/tool-execution.test.ts

# Multi-transport
vitest run tests/mcp/integration/multi-transport.test.ts

# Real-world examples
vitest run tests/mcp/integration/real-world-examples.test.ts

# Performance tests
vitest run tests/mcp/integration/performance.test.ts
```

### Custom Test Runner

```bash
# Run all tests with detailed reporting
bun tests/mcp/integration/run-integration-tests.ts

# Run specific suite
bun tests/mcp/integration/run-integration-tests.ts --suite end-to-end

# Verbose output
bun tests/mcp/integration/run-integration-tests.ts --verbose

# Help
bun tests/mcp/integration/run-integration-tests.ts --help
```

## Test Details

### End-to-End Tests (`end-to-end.test.ts`)

Tests basic MCP server functionality:
- Server initialization and shutdown
- Tool discovery and listing
- Basic tool execution
- Error handling
- Protocol message validation

**Key Scenarios:**
- Simple CLI to MCP server conversion
- Tool execution with various parameter types
- Error responses for invalid inputs
- Connection lifecycle management

### Protocol Compliance Tests (`protocol-compliance.test.ts`)

Validates MCP protocol specification compliance:
- JSON-RPC 2.0 message format
- Request/response correlation
- Tool schema validation
- Error response format
- Initialization handshake

**Key Validations:**
- Message structure and format
- Tool schema correctness
- Error handling consistency
- Protocol version compatibility

### Tool Execution Tests (`tool-execution.test.ts`)

Comprehensive tool execution scenarios:
- Various input types and validation
- Sub-command tool execution
- Async operation handling
- Error recovery
- Concurrent execution

**Key Features:**
- File operations (read, write, exists)
- Mathematical computations
- Async operations with delays
- Error injection and recovery
- Concurrent tool calls

### Multi-Transport Tests (`multi-transport.test.ts`)

Tests multiple transport mechanisms:
- STDIO transport
- SSE (Server-Sent Events) transport
- HTTP transport
- Concurrent transport operation
- Transport-specific configuration

**Key Scenarios:**
- Single transport operation
- Multi-transport server startup
- Transport configuration validation
- Concurrent connections
- Error isolation between transports

### Real-World Examples Tests (`real-world-examples.test.ts`)

Tests practical MCP server implementations:
- File processor server
- Data analysis server
- Complex operations
- Performance with real data
- Error handling in production scenarios

**Example Servers:**
- **File Processor**: File operations, analysis, transformation, search
- **Data Analysis**: Statistical analysis, correlation, outlier detection

### Performance Tests (`performance.test.ts`)

Performance and reliability testing:
- Response time measurement
- CPU-intensive operations
- Memory usage monitoring
- Sustained load testing
- Error recovery performance

**Key Metrics:**
- Response times under various loads
- Memory usage and leak detection
- CPU utilization during computation
- Concurrent request handling
- Long-running operation stability

## Test Infrastructure

### MCP Client Utilities

The `mcp-client-utils.ts` file provides:

- **`BaseMcpClient`**: Abstract base class for MCP clients
- **`McpStdioClient`**: STDIO transport client implementation
- **`McpSseClient`**: SSE transport client (placeholder)
- **`McpHttpClient`**: HTTP transport client (placeholder)
- **`McpProtocolValidator`**: Protocol compliance validation
- **`McpTestRunner`**: Automated test execution utilities

### Test Data and Fixtures

Test fixtures are located in `tests/mcp/fixtures/`:
- Sample data files for testing
- Test server configurations
- Mock data for various scenarios

## CI/CD Integration

### GitHub Actions

Add to your workflow:

```yaml
- name: Run MCP Integration Tests
  run: pnpm test:mcp

- name: Run Critical MCP Tests Only
  run: |
    pnpm test:mcp:e2e
    pnpm test:mcp:compliance
```

### Test Reports

The custom test runner generates detailed reports including:
- Pass/fail status for each suite
- Execution times
- Error details for failed tests
- Critical vs non-critical failure identification

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout in test configuration
   - Check for hanging processes
   - Verify server startup time

2. **Port Conflicts**
   - Ensure test ports are available
   - Use different ports for concurrent tests
   - Check for leftover processes

3. **File Permission Issues**
   - Verify test file permissions
   - Check temporary directory access
   - Ensure cleanup after tests

### Debug Mode

Enable debug output:

```bash
# Verbose test output
pnpm test:mcp:verbose

# Individual test with debug
DEBUG=1 vitest run tests/mcp/integration/end-to-end.test.ts
```

### Manual Testing

Test individual MCP servers manually:

```bash
# Start file processor server
bun tests/mcp/examples/file-processor-server.ts serve

# Start data analysis server
bun tests/mcp/examples/data-analysis-server.ts serve

# Test with MCP Inspector
npx @modelcontextprotocol/inspector bun tests/mcp/examples/file-processor-server.ts serve
```

## Contributing

When adding new MCP functionality:

1. **Add Integration Tests**: Create tests that verify the functionality works end-to-end
2. **Update Test Suites**: Add new test cases to existing suites or create new ones
3. **Verify Protocol Compliance**: Ensure new features follow MCP specification
4. **Performance Testing**: Add performance tests for resource-intensive features
5. **Documentation**: Update this README and test documentation

### Test Guidelines

- **Isolation**: Each test should be independent and not rely on other tests
- **Cleanup**: Always clean up resources (files, processes) after tests
- **Timeouts**: Set appropriate timeouts for different types of operations
- **Error Testing**: Include both positive and negative test cases
- **Real Data**: Use realistic test data that represents actual usage

## Future Enhancements

Planned improvements:
- Full SSE and HTTP transport client implementations
- Load testing with multiple concurrent clients
- Integration with external MCP clients
- Automated performance regression detection
- Cross-platform compatibility testing

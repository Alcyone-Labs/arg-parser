# Community Examples

This directory contains real-world examples contributed by the community that demonstrate the usage of `@alcyone-labs/arg-parser` library.

## Canny CLI (`canny-cli.js`)

A real-world CLI application that searches Canny for feature requests and can also run as an MCP server.

### Features

- **CLI Mode**: Search Canny feature requests from the command line
- **MCP Server Mode**: Expose search functionality via Model Context Protocol
- **Multiple Transports**: Supports stdio, SSE, and HTTP transports for MCP
- **Flexible Configuration**: API key via environment variable or command line
- **Rich Output**: Formatted results with colors and metadata

### Prerequisites

1. **Canny API Key**: You need a Canny API key to use this tool
   - Set the `CANNY_API_KEY` environment variable, or
   - Pass it via the `--api-key` flag

2. **Dependencies**: The required dependencies are already installed with the main project

### Usage

#### CLI Mode

```bash
# Basic search
node examples/community/canny-cli.js --query "dark mode"

# Search with filters
node examples/community/canny-cli.js --query "API" --status "open" --limit 5

# Search specific board
node examples/community/canny-cli.js --query "feature" --board "your-board-id"

# Show help
node examples/community/canny-cli.js --help
```

#### MCP Server Mode

```bash
# Start MCP server with stdio transport (default)
node examples/community/canny-cli.js serve

# Start with SSE transport on custom port
node examples/community/canny-cli.js serve --transport sse --port 3001

# Start with multiple transports
node examples/community/canny-cli.js serve --transports '[{"type":"stdio"},{"type":"sse","port":3001}]'
```

### Available Flags

- `--query, -q`: Search query for feature requests (required)
- `--api-key, -k`: Canny API key (optional if CANNY_API_KEY env var is set)
- `--limit, -l`: Number of results to return (default: 10)
- `--board, -b`: Specific board ID to search (optional)
- `--status, -s`: Filter by post status (open, under review, planned, in progress, complete, closed)

### MCP Integration

When running as an MCP server, the CLI exposes a single tool:

- **Tool Name**: `canny-search`
- **Description**: Search Canny for relevant feature requests
- **Input Schema**: Matches the CLI flags (query, limit, board, status, apiKey)
- **Output**: JSON object with search results

### Example Output

```json
{
  "success": true,
  "results": 2,
  "posts": [
    {
      "title": "Feature Request: Dark Mode",
      "status": "under review",
      "score": 42,
      "author": "John Doe",
      "details": "Please add dark mode support...",
      "url": "https://example.canny.io/posts/dark-mode",
      "tags": ["ui", "accessibility"]
    }
  ],
  "query": "dark mode"
}
```

### Testing

This example is included in the integration test suite:

```bash
# Run all Canny CLI tests
pnpm test:mcp:canny

# Run specific test file
bun test tests/mcp/integration/canny-cli.test.ts
```

### Integration with arg-parser

This example demonstrates several key features of the `@alcyone-labs/arg-parser` library:

1. **MCP Integration**: Uses `ArgParser.withMcp()` to create an MCP-enabled parser
2. **Flag Definitions**: Comprehensive flag configuration with types, enums, and defaults
3. **Error Handling**: Graceful handling of missing API keys and invalid inputs
4. **Multiple Transports**: Support for stdio, SSE, and HTTP MCP transports
5. **Real-world Usage**: Actual API integration with proper error handling

### Contributing

This example was contributed by a community member who initially had issues with version 1.0.0 (which didn't support MCP). It now serves as both a useful tool and a comprehensive test case for the library's MCP functionality.

If you have your own examples using `@alcyone-labs/arg-parser`, feel free to contribute them to this directory!

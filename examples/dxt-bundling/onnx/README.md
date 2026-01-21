# ONNX Named Entity Recognition MCP Server

A Model Context Protocol (MCP) server that demonstrates the new `--s-with-node-modules` bundling feature for native dependencies. This example uses [Transformers.js](https://huggingface.co/docs/transformers.js) with ONNX Runtime to perform named entity recognition (NER) in text using the BERT model.

## Features

- **Named Entity Recognition**: Identifies various types of named entities including persons, organizations, locations, and miscellaneous entities
- **MCP Compatible**: Full MCP server implementation with stdio and SSE transport support
- **ONNX Runtime**: Leverages native ONNX Runtime for efficient model inference
- **DXT Bundling**: Demonstrates the new `--s-with-node-modules` feature for bundling native dependencies
- **Multiple Output Formats**: Simple, detailed, and JSON output formats
- **Real-time Processing**: Fast entity extraction using BERT-based NER model

## Supported Entity Types

- **PERSON**: Person names and individual references
- **ORGANIZATION**: Company names, institutions, and organizations
- **LOCATION**: Geographic locations, places, and addresses
- **MISCELLANEOUS**: Other named entities not fitting the above categories

## Installation

Navigate to the ONNX example source directory:

```bash
cd examples/dxt-bundling/onnx/src
```

Install dependencies:

```bash
npm install
```

## Usage

### Command Line Interface

Detect named entities in text:

```bash
bun index.ts listPII --text "John Doe works at Microsoft in Seattle"
```

Get detailed analysis:

```bash
bun index.ts listPII --text "Your text here" --verbose --format detailed
```

Get model information:

```bash
bun index.ts modelInfo
```

### MCP Server Mode

Start the MCP server:

```bash
bun index.ts --s-mcp-serve
```

The server will be available on:

- **stdio**: Standard input/output transport
- **SSE**: Server-Sent Events on `http://localhost:3003`

## DXT Bundling with Native Dependencies

This example demonstrates the new `--s-with-node-modules` bundling feature designed for applications with native dependencies like ONNX Runtime.

### Building DXT Package

1. **Prepare for bundling** (ensures hoisted installation):

```bash
rm -rf node_modules
pnpm install --prod --node-linker=hoisted
```

2. **Build DXT package with node_modules**:

```bash
bun index.ts --s-build-dxt --s-with-node-modules
```

Or use the npm script:

```bash
npm run build:dxt
```

### Why `--s-with-node-modules`?

The ONNX Runtime and Transformers.js contain native binary files (.node files) that cannot be bundled using traditional JavaScript bundling techniques. The `--s-with-node-modules` flag:

- Includes the complete `node_modules` directory in the DXT package
- Uses hoisted installation (`--node-linker=hoisted`) for clean symlink-free structure
- Provides reliable distribution for applications with native dependencies
- Eliminates complex binary handling and bundling issues

## Example Output

```bash
$ bun index.ts listPII --text "John Doe works at Microsoft in Seattle and collaborates with the University of Washington"

🚀 Starting entity detection...
📝 Text length: 83 characters
🔄 Loading BERT NER model...
✅ Model loaded successfully
🔍 Analyzing text for named entities...

🔍 Named Entities Found:
   John Doe => PERSON
   Microsoft => ORGANIZATION
   Seattle => LOCATION
   University of Washington => ORGANIZATION
```

## Technical Details

### Architecture

- **ArgParser**: Handles CLI argument parsing and MCP server setup
- **Transformers.js**: Provides the pipeline for ONNX model inference
- **BERT NER Model**: `Xenova/bert-base-NER` for named entity recognition
- **ONNX Runtime**: Native runtime for efficient model execution

### Model Information

- **Model**: `Xenova/bert-base-NER`
- **Type**: Token classification using BERT architecture
- **Framework**: ONNX with Transformers.js
- **Device**: CPU inference
- **Languages**: English (primary), with some multilingual capability

### Dependencies

- `@alcyone-labs/arg-parser`: CLI and MCP framework
- `@huggingface/transformers`: ONNX model pipeline and runtime
- Native ONNX Runtime binaries (bundled in node_modules)

## Requirements

- **Node.js**: >=18.0.0
- **Bun**: Recommended runtime
- **Memory**: ~500MB for model loading
- **Network**: Internet connection for initial model download

## Development

### Testing

Run a quick test:

```bash
npm test
```

### Building TypeScript

Compile TypeScript files:

```bash
npm run build
```

### Cleaning

Remove build artifacts and dependencies:

```bash
npm run clean
```

## MCP Integration

This server can be integrated with Claude Desktop or other MCP clients. Add to your MCP configuration:

```json
{
  "mcpServers": {
    "onnx-entity-detector": {
      "command": "bun",
      "args": ["path/to/examples/dxt-bundling/onnx/src/index.ts", "--s-mcp-serve"]
    }
  }
}
```

## Bundling Comparison

| Scenario            | Bundle Method           | Use Case                                   |
| ------------------- | ----------------------- | ------------------------------------------ |
| Pure JavaScript     | Standard bundling       | Web apps, simple Node.js tools             |
| Native Dependencies | `--s-with-node-modules` | ONNX, native modules, complex dependencies |

## Performance Notes

- **First Run**: Model download and caching (~100MB)
- **Subsequent Runs**: Fast inference using cached model
- **Memory Usage**: ~300-500MB during inference
- **Processing Speed**: ~100-500ms per text depending on length

## Troubleshooting

### Model Loading Issues

If model loading fails, ensure:

- Internet connection is available for initial download
- Sufficient disk space for model cache (~100MB)
- Node.js version is >=18.0.0

### Native Dependency Issues

If you encounter native dependency issues:

- Use `npm install` for clean installation (npm uses flat structure by default)
- Ensure platform compatibility (x64 architecture recommended)
- Check that ONNX Runtime supports your platform

### DXT Building Issues

For DXT bundle creation problems:

- Verify installation: `ls node_modules` (should show flat structure)
- Ensure `--s-with-node-modules` flag is used
- Check available disk space for complete node_modules bundling

## Related Examples

- [MCP Preset Transports](../../mcp-preset-transports.ts): Basic MCP server setup
- [Community Examples](../community/): More MCP implementations

## License

MIT - See main project license

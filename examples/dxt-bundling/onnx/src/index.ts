#!/usr/bin/env node

/**
 * ONNX Named Entity Recognition MCP Server
 *
 * 🎯 KEY DEMONSTRATION: --s-with-node-modules bundling for native dependencies
 *
 * This example showcases the new `--s-with-node-modules` bundling feature which enables
 * packaging applications with complex native dependencies like ONNX Runtime.
 *
 * ✨ Features Demonstrated:
 * - Native dependency bundling (ONNX Runtime .node files)
 * - Real AI model inference (BERT NER)
 * - Complete MCP server implementation
 * - Autonomous DXT package creation
 * - Production-ready entity recognition
 *
 * 📦 Bundling Process:
 * 1. npm install (creates flat node_modules structure)
 * 2. bun index.ts --s-build-dxt --s-with-node-modules
 * 3. Creates 496MB+ DXT with all dependencies included
 * 4. Result: Fully autonomous package with ONNX Runtime
 *
 * Usage:
 *   bun index.ts listPII --text "John Doe works at Microsoft in Seattle"
 *   bun index.ts --s-mcp-serve
 *   bun index.ts --s-build-dxt --s-with-node-modules
 */
import { ArgParser } from "@alcyone-labs/arg-parser";
import { pipeline } from "@huggingface/transformers";

type PiiResult = {
  entities: Array<{ text: string; label: string }>;
  processedText: string;
  modelUsed: string;
  totalEntities: number;
};

// Global model instance - demonstrates caching for performance
let piiExtractor: any = null;

const ENTITY_LABELS = ["person", "organization", "location", "miscellaneous"];

async function initializePiiModel(): Promise<void> {
  if (!piiExtractor) {
    console.log("🔄 Loading BERT NER model...");
    try {
      // This demonstrates ONNX model loading via Transformers.js
      // The model files and ONNX Runtime binaries are bundled with --s-with-node-modules
      piiExtractor = await pipeline(
        "token-classification",
        "Xenova/bert-base-NER",
        {
          dtype: "q4f16",
        },
      );
      console.log("✅ Model loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load model:", error);
      throw new Error(`Model initialization failed: ${error}`);
    }
  }
}

async function extractPiiEntities(text: string): Promise<PiiResult> {
  await initializePiiModel();

  try {
    console.log("🔍 Analyzing text for named entities...");

    const entities = await piiExtractor(text);

    const processedEntities: Array<{ text: string; label: string }> = [];

    if (Array.isArray(entities)) {
      const aggregatedEntities = aggregateEntities(entities);

      for (const entity of aggregatedEntities) {
        const cleanLabel = entity.label.replace(/^[BI]-/, "");
        const friendlyLabel = mapEntityLabel(cleanLabel);

        processedEntities.push({
          text: entity.text,
          label: friendlyLabel,
        });
      }
    }

    return {
      entities: processedEntities,
      processedText: text,
      modelUsed: "Xenova/bert-base-NER",
      totalEntities: processedEntities.length,
    };
  } catch (error) {
    console.error("❌ Entity extraction failed:", error);
    throw new Error(`PII extraction failed: ${error}`);
  }
}

// Helper function to properly aggregate BERT tokenized entities
// This handles the B-I-O tagging scheme and subword tokens
function aggregateEntities(
  entities: any[],
): Array<{ text: string; label: string }> {
  const aggregated: Array<{ text: string; label: string }> = [];
  let currentEntity: { text: string; label: string } | null = null;

  for (const entity of entities) {
    const word = entity.word;
    const label = entity.entity;

    if (label === "O") {
      if (currentEntity) {
        aggregated.push(currentEntity);
        currentEntity = null;
      }
      continue;
    }

    if (label.startsWith("B-")) {
      if (currentEntity) {
        aggregated.push(currentEntity);
      }
      currentEntity = {
        text: word.replace(/^##/, ""),
        label: label,
      };
    } else if (label.startsWith("I-") && currentEntity) {
      const cleanWord = word.replace(/^##/, "");
      if (word.startsWith("##")) {
        currentEntity.text += cleanWord;
      } else {
        currentEntity.text += " " + cleanWord;
      }
    }
  }

  if (currentEntity) {
    aggregated.push(currentEntity);
  }

  return aggregated;
}

function mapEntityLabel(label: string): string {
  const labelMap: Record<string, string> = {
    PER: "person",
    ORG: "organization",
    LOC: "location",
    MISC: "miscellaneous",
  };

  return labelMap[label] || label.toLowerCase();
}

const cli = ArgParser.withMcp({
  appName: "ONNX Entity Detector",
  appCommandName: "onnx-entity-detector",
  description: "MCP server for named entity recognition using ONNX models",
  mcp: {
    serverInfo: {
      name: "onnx-entity-detector",
      version: "1.0.0",
      description:
        "Detects named entities in text using BERT ONNX model via Transformers.js",
    },
    logPath: "./onnx-entity-detector.log",
    defaultTransports: [{ type: "stdio" }],
  },
})
  .addTool({
    name: "listPII",
    description: "Extract and list named entities from text",
    flags: [
      {
        name: "text",
        description: "Text to analyze for named entities",
        options: ["--text", "-t"],
        type: "string",
        mandatory: true,
      },
      {
        name: "verbose",
        description: "Show detailed analysis information",
        options: ["--verbose", "-v"],
        type: "boolean",
        flagOnly: true,
      },
      {
        name: "format",
        description: "Output format (simple, detailed, json)",
        options: ["--format", "-f"],
        type: "string",
        defaultValue: "simple",
      },
    ],
    handler: async (ctx) => {
      const { text, verbose, format } = ctx.args;

      try {
        console.log("🚀 Starting entity detection...");
        console.log(`📝 Text length: ${text.length} characters`);

        const result = await extractPiiEntities(text);

        if (verbose) {
          console.log("📊 Analysis Results:");
          console.log(`   Model: ${result.modelUsed}`);
          console.log(`   Total entities found: ${result.totalEntities}`);
          console.log(
            `   Text processed: ${result.processedText.substring(0, 100)}...`,
          );
        }

        if (result.entities.length === 0) {
          console.log("✅ No named entities detected in the text");
          return {
            success: true,
            entities: [],
            message: "No named entities found",
            modelUsed: result.modelUsed,
          };
        }

        console.log("\n🔍 Named Entities Found:");
        for (const entity of result.entities) {
          console.log(`   ${entity.text} => ${entity.label}`);
        }

        const response = {
          success: true,
          entities: result.entities,
          totalCount: result.totalEntities,
          modelUsed: result.modelUsed,
          textLength: text.length,
        };

        if (format === "detailed") {
          return {
            ...response,
            processedText: result.processedText,
            supportedLabels: ENTITY_LABELS,
          };
        }

        if (format === "json") {
          return response;
        }

        return {
          message: `Found ${result.totalEntities} named entities`,
          entities: result.entities.map((e) => `${e.text} => ${e.label}`),
          success: true,
        };
      } catch (error) {
        console.error("❌ Entity detection failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          entities: [],
        };
      }
    },
  })
  .addTool({
    name: "modelInfo",
    description: "Get information about the loaded NER model",
    flags: [],
    handler: async () => {
      try {
        return {
          success: true,
          modelId: "Xenova/bert-base-NER",
          description: "BERT-based Named Entity Recognition model",
          supportedLabels: ENTITY_LABELS,
          framework: "Transformers.js with ONNX Runtime",
          device: "CPU",
          loaded: piiExtractor !== null,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });

export { cli };

// 🚀 This CLI demonstrates how ArgParser + ONNX Runtime + Transformers.js
// can be bundled into a single autonomous DXT package using --s-with-node-modules
await cli.parse(process.argv.slice(2));

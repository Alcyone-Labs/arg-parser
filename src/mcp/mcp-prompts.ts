/**
 * MCP Prompts Management
 *
 * This module provides functionality for managing MCP prompts - server-side prompt templates
 * that clients can discover and execute with custom parameters for dynamic text generation.
 */

import { z, type ZodTypeAny } from "zod";
import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";

const logger = createMcpLogger("MCP Prompts");

/**
 * Prompt message content types
 */
export interface McpPromptTextContent {
  type: "text";
  text: string;
}

export interface McpPromptImageContent {
  type: "image";
  data: string; // base64 encoded
  mimeType: string;
}

export type McpPromptContent = McpPromptTextContent | McpPromptImageContent;

/**
 * Prompt message structure
 */
export interface McpPromptMessage {
  role: "user" | "assistant" | "system";
  content: McpPromptContent;
}

/**
 * Prompt response structure
 */
export interface McpPromptResponse {
  description?: string;
  messages: McpPromptMessage[];
}

/**
 * Prompt handler function type
 */
export type McpPromptHandler = (
  args: any,
) => McpPromptResponse | Promise<McpPromptResponse>;

/**
 * Prompt configuration for registration
 */
export interface McpPromptConfig {
  name: string;
  title?: string;
  description?: string;
  argsSchema: ZodTypeAny;
  handler: McpPromptHandler;
}

/**
 * Internal prompt storage structure
 */
export interface McpPromptEntry {
  config: McpPromptConfig;
  registeredAt: Date;
}

/**
 * MCP Prompts Manager
 *
 * Manages registration, storage, and execution of MCP prompts
 */
export class McpPromptsManager {
  private prompts = new Map<string, McpPromptEntry>();
  private changeListeners = new Set<() => void>();

  /**
   * Register a new prompt
   */
  addPrompt(config: McpPromptConfig): void {
    // Validate configuration
    this.validatePromptConfig(config);

    // Store prompt
    this.prompts.set(config.name, {
      config,
      registeredAt: new Date(),
    });

    // Notify listeners of change
    this.notifyChange();
  }

  /**
   * Remove a prompt by name
   */
  removePrompt(name: string): boolean {
    const removed = this.prompts.delete(name);
    if (removed) {
      this.notifyChange();
    }
    return removed;
  }

  /**
   * Get all registered prompts
   */
  getPrompts(): McpPromptConfig[] {
    return Array.from(this.prompts.values()).map((entry) => entry.config);
  }

  /**
   * Get a specific prompt by name
   */
  getPrompt(name: string): McpPromptConfig | undefined {
    return this.prompts.get(name)?.config;
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Execute a prompt with given arguments
   */
  async executePrompt(name: string, args: any): Promise<McpPromptResponse> {
    const entry = this.prompts.get(name);
    if (!entry) {
      throw new Error(`Prompt '${name}' not found`);
    }

    // Validate arguments against schema
    try {
      const validatedArgs = entry.config.argsSchema.parse(args);
      return await entry.config.handler(validatedArgs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid arguments for prompt '${name}': ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Add change listener
   */
  onPromptsChange(listener: () => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove change listener
   */
  offPromptsChange(listener: () => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Clear all prompts
   */
  clear(): void {
    const hadPrompts = this.prompts.size > 0;
    this.prompts.clear();
    if (hadPrompts) {
      this.notifyChange();
    }
  }

  /**
   * Get prompt count
   */
  count(): number {
    return this.prompts.size;
  }

  /**
   * Validate prompt configuration
   */
  private validatePromptConfig(config: McpPromptConfig): void {
    if (!config.name || typeof config.name !== "string") {
      throw new Error("Prompt name is required and must be a string");
    }

    if (!config.argsSchema) {
      throw new Error("Prompt argsSchema is required");
    }

    if (typeof config.handler !== "function") {
      throw new Error("Prompt handler is required and must be a function");
    }

    if (this.prompts.has(config.name)) {
      throw new Error(`Prompt with name '${config.name}' already exists`);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (error) {
        logger.error("Error in prompt change listener:", error);
      }
    }
  }
}

/**
 * Helper function to create common prompt configurations
 */

/**
 * Create a code review prompt
 */
export const createCodeReviewPrompt = (): McpPromptConfig => ({
  name: "code-review",
  title: "Code Review Assistant",
  description: "Generate prompts for code review with focus areas",
  argsSchema: z.object({
    code: z.string().describe("The code to review"),
    language: z.string().optional().describe("Programming language"),
    focus: z
      .enum(["security", "performance", "style", "bugs", "general"])
      .optional()
      .describe("Review focus area"),
  }),
  handler: ({ code, language, focus }) => ({
    description: `Code review prompt for ${language || "code"} focusing on ${focus || "general best practices"}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this ${language || "code"} focusing on ${focus || "general best practices"}:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
        },
      },
    ],
  }),
});

/**
 * Create a text summarization prompt
 */
export const createSummarizationPrompt = (): McpPromptConfig => ({
  name: "summarize",
  title: "Text Summarization",
  description: "Generate prompts for text summarization",
  argsSchema: z.object({
    text: z.string().describe("The text to summarize"),
    length: z
      .enum(["brief", "medium", "detailed"])
      .optional()
      .describe("Summary length"),
    style: z
      .enum(["bullet-points", "paragraph", "executive"])
      .optional()
      .describe("Summary style"),
  }),
  handler: ({ text, length, style }) => {
    const lengthInstruction =
      length === "brief"
        ? "in 1-2 sentences"
        : length === "detailed"
          ? "in detail with key points"
          : "concisely";

    const styleInstruction =
      style === "bullet-points"
        ? "as bullet points"
        : style === "executive"
          ? "as an executive summary"
          : "in paragraph form";

    return {
      description: `Summarization prompt for ${length || "medium"} ${style || "paragraph"} summary`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please summarize the following text ${lengthInstruction} ${styleInstruction}:\n\n${text}`,
          },
        },
      ],
    };
  },
});

/**
 * Create a translation prompt
 */
export const createTranslationPrompt = (): McpPromptConfig => ({
  name: "translate",
  title: "Text Translation",
  description: "Generate prompts for text translation",
  argsSchema: z.object({
    text: z.string().describe("The text to translate"),
    targetLanguage: z.string().describe("Target language for translation"),
    sourceLanguage: z
      .string()
      .optional()
      .describe("Source language (auto-detect if not specified)"),
    tone: z
      .enum(["formal", "casual", "professional"])
      .optional()
      .describe("Translation tone"),
  }),
  handler: ({ text, targetLanguage, sourceLanguage, tone }) => {
    const sourceInstruction = sourceLanguage
      ? `from ${sourceLanguage}`
      : "(auto-detect source language)";
    const toneInstruction = tone ? ` in a ${tone} tone` : "";

    return {
      description: `Translation prompt ${sourceInstruction} to ${targetLanguage}${toneInstruction}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please translate the following text ${sourceInstruction} to ${targetLanguage}${toneInstruction}:\n\n${text}`,
          },
        },
      ],
    };
  },
});

/**
 * Create a documentation prompt
 */
export const createDocumentationPrompt = (): McpPromptConfig => ({
  name: "document-code",
  title: "Code Documentation",
  description: "Generate prompts for code documentation",
  argsSchema: z.object({
    code: z.string().describe("The code to document"),
    language: z.string().optional().describe("Programming language"),
    style: z
      .enum(["jsdoc", "sphinx", "markdown", "inline"])
      .optional()
      .describe("Documentation style"),
    includeExamples: z.boolean().optional().describe("Include usage examples"),
  }),
  handler: ({ code, language, style, includeExamples }) => {
    const styleInstruction = style ? ` using ${style} format` : "";
    const examplesInstruction = includeExamples
      ? " Include usage examples."
      : "";

    return {
      description: `Documentation prompt for ${language || "code"}${styleInstruction}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate documentation for this ${language || "code"}${styleInstruction}.${examplesInstruction}\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
          },
        },
      ],
    };
  },
});

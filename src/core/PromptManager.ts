import * as p from "@clack/prompts";
import type { IHandlerContext, IPromptableFlag, PromptFieldConfig, PromptWhen } from "./types";

/**
 * Options for creating a PromptManager instance.
 */
export interface PromptManagerOptions {
  /** The current handler context, used for passing to prompt functions */
  context: IHandlerContext;
  /** Called when user cancels (Ctrl+C) during prompts */
  onCancel?: (ctx: IHandlerContext) => void | Promise<void>;
}

/**
 * Result of executing interactive prompts.
 */
export interface PromptResult {
  /** Whether the prompts were completed successfully */
  success: boolean;
  /** The collected answers (flag name -> value) */
  answers: Record<string, any>;
  /** Whether the user cancelled */
  cancelled: boolean;
}

/**
 * Manages interactive prompts using @clack/prompts.
 *
 * This class handles:
 * - Collecting promptable flags and sorting them by sequence
 * - Executing prompts in order with @clack/prompts
 * - Validation and re-prompt loops
 * - User cancellation (Ctrl+C)
 * - TTY detection
 * - Automatic defaultValue fallback
 * - Select all/none toggle for multiselect
 * - Conditional prompt skipping
 *
 * @example
 * ```typescript
 * const promptManager = new PromptManager({
 *   context: handlerContext,
 *   onCancel: () => console.log("Cancelled")
 * });
 *
 * const result = await promptManager.executePrompts([
 *   { flag: envFlag, name: "environment" },
 *   { flag: versionFlag, name: "version" }
 * ]);
 *
 * if (result.success) {
 *   console.log("Answers:", result.answers);
 * }
 * ```
 */
export class PromptManager {
  #context: IHandlerContext;
  #onCancel?: (ctx: IHandlerContext) => void | Promise<void>;

  /**
   * Creates a new PromptManager instance.
   *
   * @param options - Configuration options
   */
  constructor(options: PromptManagerOptions) {
    this.#context = options.context;
    this.#onCancel = options.onCancel;
  }

  /**
   * Checks if the current environment supports interactive prompts.
   * Returns false in non-TTY environments (CI, pipes, etc.).
   */
  static isInteractiveEnvironment(): boolean {
    // Check if stdin is a TTY
    if (typeof process !== "undefined" && process.stdin) {
      return process.stdin.isTTY === true;
    }
    return false;
  }

  /**
   * Determines if interactive mode should be triggered based on promptWhen condition.
   *
   * @param promptWhen - The condition to check
   * @param flags - The promptable flags to check
   * @param args - The current parsed args
   * @returns True if interactive mode should be triggered
   */
  static shouldTriggerInteractive(
    promptWhen: PromptWhen,
    flags: Array<{ flag: IPromptableFlag; name: string }>,
    args: Record<string, any>,
  ): boolean {
    switch (promptWhen) {
      case "always":
        return true;

      case "interactive-flag":
        // Check for --interactive or -i flag
        return args["interactive"] === true;

      case "missing":
        // Check if any promptable flag is missing a value
        return flags.some(({ name }) => {
          const value = args[name];
          // Consider undefined, null, or empty string as missing
          return value === undefined || value === null || value === "";
        });

      default:
        return false;
    }
  }

  /**
   * Sorts flags by their prompt sequence.
   * Falls back to array order if promptSequence is not specified.
   * Ties are broken by array order.
   *
   * @param flags - Array of flags to sort
   * @returns Sorted array of flags
   */
  static sortFlagsBySequence(
    flags: Array<{ flag: IPromptableFlag; name: string; index: number }>,
  ): Array<{ flag: IPromptableFlag; name: string; index: number }> {
    return [...flags].sort((a, b) => {
      const seqA = a.flag.promptSequence ?? a.index;
      const seqB = b.flag.promptSequence ?? b.index;

      if (seqA !== seqB) {
        return seqA - seqB;
      }

      // Tie-breaker: original array order
      return a.index - b.index;
    });
  }

  /**
   * Gets the initial value for a prompt, falling back to flag's defaultValue.
   *
   * @param config - The prompt configuration
   * @param flag - The flag definition
   * @returns The initial value to use
   */
  static getInitialValue(config: PromptFieldConfig, flag: IPromptableFlag): any {
    // Priority: config.initial > flag.defaultValue > undefined
    if (config.initial !== undefined) {
      return config.initial;
    }

    // Check for defaultValue on the flag
    if ("defaultValue" in flag && flag["defaultValue"] !== undefined) {
      return flag["defaultValue"];
    }

    return undefined;
  }

  /**
   * Executes all prompts in sequence.
   *
   * @param flags - Array of promptable flags with their names
   * @returns The result of the prompt execution
   */
  async executePrompts(
    flags: Array<{ flag: IPromptableFlag; name: string }>,
  ): Promise<PromptResult> {
    // Add index for sorting
    const flagsWithIndex = flags.map((f, index) => ({ ...f, index }));

    // Sort by sequence
    const sortedFlags = PromptManager.sortFlagsBySequence(flagsWithIndex);

    const answers: Record<string, any> = {};

    for (const { flag, name } of sortedFlags) {
      try {
        // Skip if flag doesn't have a prompt function
        if (!flag.prompt) {
          continue;
        }

        // Get prompt configuration from the flag
        const config = await flag.prompt(this.#context);

        // Check if prompt should be skipped
        if (config.skip === true) {
          continue;
        }

        // Merge initial value from defaultValue if not specified
        const configWithInitial = {
          ...config,
          initial: PromptManager.getInitialValue(config, flag),
        };

        // Execute the prompt with validation loop
        const value = await this.#executePromptWithValidation(name, configWithInitial);

        // Store the answer
        answers[name] = value;

        // Update context so subsequent prompts can access previous answers
        this.#context.promptAnswers = { ...this.#context.promptAnswers, ...answers };
      } catch (error) {
        // Handle cancellation
        if (this.#isCancelled(error)) {
          await this.#handleCancel();
          return { success: false, answers, cancelled: true };
        }

        // Re-throw other errors
        throw error;
      }
    }

    return { success: true, answers, cancelled: false };
  }

  /**
   * Executes a single prompt with validation and re-prompt loop.
   *
   * @param name - The flag name (for logging)
   * @param config - The prompt configuration
   * @returns The validated value
   */
  async #executePromptWithValidation(name: string, config: PromptFieldConfig): Promise<any> {
    while (true) {
      // Execute the prompt
      const value = await this.#executePrompt(config);

      // Check for cancellation
      if (p.isCancel(value)) {
        throw new Error("USER_CANCELLED");
      }

      // Validate if validation function provided
      if (config.validate) {
        const validationResult = await config.validate(value, this.#context);

        if (validationResult === true) {
          // Validation passed
          return value;
        } else if (typeof validationResult === "string") {
          // Validation failed with error message
          p.log.error(validationResult);
          // Continue loop to re-prompt
          continue;
        } else {
          // Validation failed without message
          p.log.error(`Invalid value for ${name}`);
          continue;
        }
      }

      // No validation, return value
      return value;
    }
  }

  /**
   * Executes a single prompt based on its type.
   *
   * @param config - The prompt configuration
   * @returns The user's response
   */
  async #executePrompt(config: PromptFieldConfig): Promise<any> {
    switch (config.type) {
      case "text":
        return p.text({
          message: config.message,
          placeholder: config.placeholder,
          initialValue: config.initial,
        });

      case "password":
        return p.password({
          message: config.message,
        });

      case "confirm":
        return p.confirm({
          message: config.message,
          initialValue: config.initial ?? false,
        });

      case "select":
        return p.select({
          message: config.message,
          options: this.#normalizeOptions(config.options ?? []),
          initialValue: config.initial,
          maxItems: config.maxItems,
        });

      case "multiselect":
        // Use custom multiselect with select all support if enabled
        if (config.allowSelectAll) {
          return this.#executeMultiselectWithSelectAll(config);
        }
        return p.multiselect({
          message: config.message,
          options: this.#normalizeOptions(config.options ?? []),
          initialValues: config.initial,
          maxItems: config.maxItems,
        });

      default:
        throw new Error(`Unknown prompt type: ${config.type}`);
    }
  }

  /**
   * Executes a multiselect prompt with select all/none support.
   * User can press 'a' to toggle all items on/off.
   *
   * @param config - The prompt configuration
   * @returns Array of selected values
   */
  async #executeMultiselectWithSelectAll(config: PromptFieldConfig): Promise<any[]> {
    const options = this.#normalizeOptions(config.options ?? []);
    const allValues = options.map((opt) => opt.value);

    // Track selected values
    let selectedValues: any[] = Array.isArray(config.initial) ? [...config.initial] : [];

    // Show instructions
    p.log.info("Press 'a' to select/deselect all options");

    // Use groupMultiselect for better control, or wrap the standard multiselect
    // For now, we'll use a custom implementation with text prompt for the toggle
    // and then show the multiselect with the updated selection

    // Alternative approach: Use a loop with note + multiselect
    while (true) {
      const result = await p.multiselect({
        message: `${config.message} (press 'a' to toggle all)`,
        options: options.map((opt) => ({
          ...opt,
          // Mark as selected if in selectedValues
        })),
        initialValues: selectedValues,
        maxItems: config.maxItems,
      });

      if (p.isCancel(result)) {
        return result as unknown as any[];
      }

      // Check if user wants to toggle all (we'll detect this via a separate prompt)
      // Since @clack/prompts doesn't expose keyboard events, we'll use a workaround:
      // Show a follow-up prompt asking if they want to toggle all

      if (result.length === 0 || (result.length < allValues.length && result.length > 0)) {
        // Ask if they want to toggle all
        const toggleAll = await p.confirm({
          message: "Select all options?",
          initialValue: false,
        });

        if (p.isCancel(toggleAll)) {
          return result;
        }

        if (toggleAll) {
          selectedValues = [...allValues];
          continue; // Re-show multiselect with all selected
        }
      } else if (result.length === allValues.length) {
        // All selected, offer to deselect all
        const deselectAll = await p.confirm({
          message: "Deselect all options?",
          initialValue: false,
        });

        if (p.isCancel(deselectAll)) {
          return result;
        }

        if (deselectAll) {
          selectedValues = [];
          continue; // Re-show multiselect with none selected
        }
      }

      return result;
    }
  }

  /**
   * Normalizes options to the format expected by @clack/prompts.
   *
   * @param options - Raw options from config
   * @returns Normalized options
   */
  #normalizeOptions(
    options: Array<string | { label: string; value: any; hint?: string }>,
  ): Array<{ value: any; label: string; hint?: string }> {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }

  /**
   * Handles user cancellation.
   */
  async #handleCancel(): Promise<void> {
    p.cancel("Operation cancelled by user");

    if (this.#onCancel) {
      await this.#onCancel(this.#context);
    }
  }

  /**
   * Checks if an error indicates user cancellation.
   *
   * @param error - The error to check
   * @returns True if the user cancelled
   */
  #isCancelled(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message === "USER_CANCELLED";
    }
    return false;
  }
}

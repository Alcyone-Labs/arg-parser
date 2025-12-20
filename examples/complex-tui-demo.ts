import chalk from "@alcyone-labs/simple-chalk";
import { UI } from "../src";

// --- Data ---
const capabilities = [
  { label: "ai/model", value: "model", description: "AI Model management" },
  { label: "ai/repl", value: "repl", description: "Interactive REPL" },
  {
    label: "ai/embedding",
    value: "embedding",
    description: "Vector Embeddings",
  },
  { label: "ai/rag", value: "rag", description: "Retrieval Augmented Gen" },
  {
    label: "sys/logs",
    value: "logs",
    description: "System Logs (Long Scroll)",
  },
];

const tools: Record<string, UI.IListItem[]> = {
  model: [
    { label: "list", value: "model-list", description: "List models" },
    { label: "show", value: "model-show", description: "Show model details" },
  ],
  repl: [
    { label: "start", value: "repl-start", description: "Start REPL session" },
  ],
  embedding: [
    {
      label: "generate",
      value: "embed-gen",
      description: "Generate embedding",
    },
    { label: "batch", value: "embed-batch", description: "Batch generation" },
  ],
  rag: [
    { label: "ingest", value: "rag-ingest", description: "Ingest documents" },
    { label: "query", value: "rag-query", description: "Query knowledge base" },
  ],
  logs: [
    { label: "verbose", value: "sys-logs", description: "View verbose logs" },
  ],
};

const toolDetails: Record<string, (t: UI.ITheme) => string> = {
  "model-list": (t) => `${t.accent("Tool: List Models")}
${t.muted("List all available AI models from configured providers.")}
${t.warning("Usage:")} aquaria ai model list [options]`,

  "model-show": (t) => `${t.accent("Tool: Show Model")}
${t.muted("Display detailed information about a specific model.")}`,

  "repl-start": (t) => `${t.accent("Tool: REPL")}
${t.muted("Start an interactive AI chat session.")}`,

  "embed-gen": (t) => `${t.accent("Tool: Generate Embedding")}
${t.muted("Create vector embeddings for text.")}`,

  "embed-batch": (t) => `${t.accent("Tool: Batch Embeddings")}
${t.muted("Create multiple embeddings at once.")}`,

  "rag-ingest": (t) => `${t.accent("Tool: RAG Ingest")}
${t.muted("Ingest files into the vector database.")}`,

  "rag-query": (t) => `${t.accent("Tool: RAG Query")}
${t.muted("Retrieve relevant context for a query.")}`,

  // New Long Content for Scrolling
  "sys-logs": (t) => {
    const totalLines = 200;
    let content = `${t.accent("System Logs (Verbose - Extended for Scrolling Test)")}\n${t.muted(`Showing last ${totalLines} entries...`)}\n${t.muted("Use arrow keys, Page Up/Down, or mouse wheel to scroll")}\n\n`;

    const logTypes = [
      {
        type: "[INFO]",
        color: t.success,
        messages: [
          "API request processed",
          "Database connection established",
          "Cache hit",
          "User authenticated",
          "File uploaded successfully",
        ],
      },
      {
        type: "[WARN]",
        color: t.warning,
        messages: [
          "Rate limit approaching",
          "Memory usage high",
          "Slow query detected",
          "Deprecated API used",
          "Configuration missing",
        ],
      },
      {
        type: "[ERR]",
        color: t.error,
        messages: [
          "Database connection failed",
          "Invalid API key",
          "Timeout occurred",
          "File not found",
          "Permission denied",
        ],
      },
      {
        type: "[DEBUG]",
        color: t.muted,
        messages: [
          "Entering function",
          "Variable state",
          "Loop iteration",
          "Cache miss",
          "Network request",
        ],
      },
    ];

    for (let i = 1; i <= totalLines; i++) {
      const logType = logTypes[i % logTypes.length];
      const message =
        logType.messages[Math.floor(Math.random() * logType.messages.length)];
      const timestamp = `2023-10-27 ${String(Math.floor(i / 60) + 10).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`;
      const latency = Math.floor(Math.random() * 500);
      const lineNum = String(i).padStart(3, "0");

      content += `${t.muted(`[${lineNum}]`)} ${t.muted(timestamp)} ${logType.color(logType.type)} ${message} (latency: ${latency}ms)\n`;

      // Occasionally add multi-line entries for more realistic scrolling
      if (i % 15 === 0) {
        content += `${t.muted(`[${lineNum}]`)} ${t.muted(timestamp)} ${logType.color(logType.type)} Stack trace:\n`;
        content += `${t.muted(`[${lineNum}]`)}   ${t.muted("  at processRequest (app.js:234:15)")}\n`;
        content += `${t.muted(`[${lineNum}]`)}   ${t.muted("  at handleAPI (router.js:89:8)")}\n`;
      }
    }

    content += `\n${t.accent("--- End of Logs ---")}\n${t.muted(`Total: ${totalLines} lines displayed`)}`;
    return content;
  },
};

// --- Logic ---

UI.ThemeManager.setTheme("Default");

// Right Pane
const detailsArea = new UI.ScrollArea({
  content: "Select an item to view details...",
});

// Left Pane Logic
const navStack = new UI.StackNavigator({
  // Initial placeholder, will be set below
  initialComponent: undefined as any,
});

// Helper to manage current selection for theme updates
let currentDetailsId = "";

function updateDetails(idOrText: string) {
  // If it looks like a known ID, store it
  if (toolDetails[idOrText]) {
    currentDetailsId = idOrText;
    const generator = toolDetails[idOrText];
    detailsArea.setContent(generator(UI.ThemeManager.current));
  } else {
    // Raw text (fallback)
    currentDetailsId = ""; // clear ID if raw text
    detailsArea.setContent(idOrText);
  }
}

// 2. Tools List Factory
function createToolsList(capabilityId: string) {
  return new UI.List({
    items: tools[capabilityId] || [],
    onSelect: (item) => {
      updateDetails(item.value);
    },
    onSubmit: (item) => {
      updateDetails(chalk.green("Executing: " + item.label + "..."));
    },
  });
}

// 1. Capabilities List (Root)
const capabilitiesList = new UI.List({
  items: capabilities,
  onSelect: (item) => {
    // Generate dynamic text for category
    const t = UI.ThemeManager.current;
    const text = `${t.accent(item.label)}\n${t.muted(item.description || "")}\n\nPress ${t.highlight("Enter")} or ${t.highlight("Right")} to view tools.`;
    detailsArea.setContent(text);
    currentDetailsId = ""; // No specific tool ID
  },
  onSubmit: (item) => {
    const nextList = createToolsList(item.value);
    navStack.push(nextList);
    // Force update details for the first item of the new list?
    // Or wait for user to move?
    // Better UX: select first item automatically?
    // For now, let standard behavior apply (List selects index 0 by default).
    // Manually trigger onSelect for the new list's first item to update details?
    if (tools[item.value]?.length > 0) {
      const firstTool = tools[item.value][0];
      // Pass ID to let updateDetails handle generation
      updateDetails(firstTool.value);
    } else {
      updateDetails("No tools found.");
    }
  },
});

// Re-init stack with correct component
// (Dirty hack accessing private stack or just making a new StackNav? New StackNav is cleaner)
const realNavStack = new UI.StackNavigator({
  initialComponent: capabilitiesList,
});

// Search Input
const searchInput = new UI.Input({
  placeholder: "Type to filter...",
  prefix: "🔍 ",
  onChange: (val) => {
    updateDetails(`Searching for: ${chalk.yellow(val)}...`);
  },
});

// Left Column Layout (Input + Stack)
const leftColumn = new UI.SplitLayout({
  direction: "vertical",
  splitRatio: 0.1, // Small header
  first: searchInput,
  second: realNavStack,
});

// Main Layout (Left Col + Right Details)
const mainLayout = new UI.SplitLayout({
  direction: "horizontal",
  splitRatio: 0.3,
  first: leftColumn,
  second: detailsArea,
});

// Global Key Wrapper for Theme Toggle & Exit
class GlobalHandler extends UI.Component {
  constructor(private child: UI.Component) {
    super({});
  }

  public override resize(x: number, y: number, width: number, height: number) {
    this.child.resize(x, y, width, height);
  }
  public override render() {
    return this.child.render();
  }

  public override handleInput(key: string) {
    if (key === "q") {
      // Avoid conflicting with search? No, search has focus?
      // In input, "q" is a letter.
      // We need focus management or a modifier.
      // Let's use Ctrl+C for exit (handled by App).
      // Let's use 'Tab' to switch themes? Or F1?
    }

    // Let's use F1 to toggle theme
    // F1 is \u001bOP or \u001b[11~ or similar depending on term.
    // Let's use 'Ctrl+t' => \u0014
    if (key === "\u0014") {
      const current = UI.ThemeManager.current;
      // Simple toggle
      if (current === UI.Themes.Default) UI.ThemeManager.setTheme("Light");
      else if (current === UI.Themes.Light) UI.ThemeManager.setTheme("Monokai");
      else UI.ThemeManager.setTheme("Default");

      // Refresh Content
      if (currentDetailsId && toolDetails[currentDetailsId]) {
        updateDetails(currentDetailsId);
      } else {
        // Force refresh active list selection to re-trigger onSelect?
        // Or just let next navigation fix it.
        // ideally we re-render the current view's explanation.
        // Hack: trigger a fake move? No.
        // Let's just update the status line if nothing else.
        const t = UI.ThemeManager.current;
        // If at root:
        // detailsArea.setContent(`${t.accent("Theme Changed")}... Select item to refresh view.`);
      }
      return;
    }

    this.child.handleInput(key);
  }

  public override handleMouse(event: any) {
    this.child.handleMouse(event);
  }
}

const root = new GlobalHandler(mainLayout);

const app = new UI.App();

// Initial Content
if (capabilities.length > 0) {
  // Manually trigger the select logic for the first item to populate details
  // using the handler we defined (ugly access but verified works in JS/TS pattern)
  // Or just manually set it.
  const t = UI.ThemeManager.current;
  const item = capabilities[0];
  const text = `${t.accent(item.label)}\n${t.muted(item.description || "")}\n\nPress ${t.highlight("Enter")} or ${t.highlight("Right")} to view tools.`;
  detailsArea.setContent(text);
}

// Initial resize to fill screen
const { columns, rows } = process.stdout;
root.resize(0, 0, columns, rows);

console.clear();
console.log(chalk.cyan("Starting Standardized TUI Demo..."));
console.log(
  chalk.gray(
    "Controls: Arrows to navigate, Enter/Right to Drill Down, Esc/Left to Go Back. Ctrl+T to Toggle Theme.",
  ),
);

setTimeout(() => {
  app.run(root);
}, 1000);

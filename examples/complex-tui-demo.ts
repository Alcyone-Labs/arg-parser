import chalk from "@alcyone-labs/simple-chalk";
import { UI } from "../src";

// --- Data ---
const capabilities = [
  { label: "ai/model", value: "model", description: "AI Model management" },
  { label: "ai/repl", value: "repl", description: "Interactive REPL" },
  { label: "ai/embedding", value: "embedding", description: "Vector Embeddings" },
  { label: "sys/logs", value: "logs", description: "System Logs (Live)" },
  { label: "ui/demos", value: "demos", description: "UI Component Demos" },
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
    { label: "generate", value: "embed-gen", description: "Generate embedding" },
    { label: "batch", value: "embed-batch", description: "Batch generation" },
  ],
  logs: [
    { label: "verbose", value: "sys-logs", description: "View verbose logs" },
  ],
  demos: [
    { label: "Text Wrapping", value: "demo-wrapping", description: "Test soft wrapping" },
  ],
};

// --- View Factories ---

/**
 * Creates a rich interactive view for a tool using Cards and Buttons.
 */
function createToolDetailView(id: string, label: string): UI.Component {
    const t = UI.ThemeManager.current;

    // 1. Description Card (Top)
    const descCard = new UI.Card({
        title: ` About ${label} `,
        children: [
            new UI.Label({
                text: `\n  Tool: ${chalk.bold(id)}\n  Category: AI Operations\n\n  Use this tool to interact with the system backend.\n  Config: ${t.highlight("~/.aquaria/config.json")}`,
                align: "left"
            })
        ],
        style: { border: true }
    });

    // 2. Action Buttons (Bottom)
    const copyBtn = new UI.Button({
        label: " Copy Command ",
        onClick: () => {
            UI.Clipboard.copy(`aquaria run ${id}`);
            app.toast.show("Command Copied!", "success");
        }
    });

    const runBtn = new UI.Button({
        label: " Run Tool ",
        onClick: () => {
            app.toast.show("Executing tool in background...", "info");
        }
    });
    
    const actionsLayout = new UI.SplitLayout({
        direction: "horizontal",
        first: copyBtn,
        second: runBtn,
        gap: 2,
        splitRatio: "auto"
    });

    const actionsCard = new UI.Card({
        title: " Actions ",
        children: [actionsLayout],
        style: { borderColor: "green" }
    });

    // Combine Top and Bottom
    return new UI.SplitLayout({
        direction: "vertical",
        first: descCard,
        second: actionsCard,
        splitRatio: 0.6, // Description takes 60%
        gap: 1
    });
}

function createLogView(): UI.Component {
    return new UI.Card({
        title: " System Logs ",
        style: { border: true },
        children: [
            new UI.ScrollArea({
                content: "[INFO] System started\n[INFO] Connecting to mesh...\n[WARN] High latency on node-5\n[INFO] AI Module loaded\n... (Scroll for more)",
                wrapText: true
            })
        ]
    });
}

// --- App Setup ---

const app = new UI.App();
UI.ThemeManager.setTheme("Default");

// Right Pane: Managed by a StackNavigator to allow swapping views
const rightPaneStack = new UI.StackNavigator({
    initialComponent: new UI.Label({ 
        text: "\n  Select a category from the left to begin.", 
        dim: true, 
        align: "left" 
    })
});

// Left Pane: Navigation List
const navList = new UI.List({
    items: capabilities,
    onSelect: (item) => {
        // When category selected, show summary
        rightPaneStack.setRoot(new UI.Card({
            title: ` Category: ${item.label} `,
            children: [
                new UI.Label({ text: `\n  ${item.description}\n\n  Press [Enter] to drill down.` })
            ]
        }));
    },
    onSubmit: (item) => {
        // Drill down to tools
        const toolItems = tools[item.value] || [];
        if (toolItems.length === 0) return;

        const toolList = new UI.List({
            items: toolItems,
            onSelect: (tItem) => {
                // Show tool details in Right Pane
                if (tItem.value === "sys-logs") {
                    rightPaneStack.setRoot(createLogView());
                } else {
                    rightPaneStack.setRoot(createToolDetailView(tItem.value, tItem.label));
                }
            },
            onSubmit: (tItem) => {
                 app.toast.show(`Selected ${tItem.label}`, "success");
            }
        });

        // Push new list to Left Pane Stack (we need a stack there too!)
        leftStack.push(toolList);
        
        // Auto-select first tool
        if (toolItems.length > 0) {
            const first = toolItems[0];
             if (first.value === "sys-logs") {
                rightPaneStack.setRoot(createLogView());
            } else {
                rightPaneStack.setRoot(createToolDetailView(first.value, first.label));
            }
        }
    }
});

const leftStack = new UI.StackNavigator({
    initialComponent: navList
});

// Main Layout
const mainLayout = new UI.SplitLayout({
    direction: "horizontal",
    first: leftStack,
    second: rightPaneStack,
    splitRatio: 0.3, 
    gap: 1
});

// Footer
const footer = new UI.Card({
    style: { border: false, backgroundColor: "bgBlack" }, // Inverted bar style? Or just label
    children: [
        new UI.Label({ 
            text: " [Esc] Back   [Arrows] Navigate   [Enter] Select   [Ctrl+T] Theme   [Q] Quit ",
            align: "center",
            dim: true
        })
    ]
});
// Simplify footer to Label if Card overhead is unwanted
const footerLabel = new UI.Label({ 
     text: " [Esc] Back   [Arrows] Navigate   [Enter] Select   [Ctrl+T] Theme   [Q] Quit ",
     align: "center",
     dim: true
});


const root = new UI.SplitLayout({
    direction: "vertical",
    first: mainLayout,
    second: footerLabel,
    splitRatio: 0.9,
    gap: 0
});

// Global Handler
class GlobalHandler extends UI.Component {
    constructor(private child: UI.Component) { super(); }
    public override resize(x:number, y:number, w:number, h:number) { this.child.resize(x,y,w,h); }
    public override render() { return this.child.render(); }
    public override handleInput(key: string) {
        if (key === "\u0014") { // Ctrl+T
            const current = UI.ThemeManager.currentName;
            const themes = ["Default", "Ocean", "Monokai"];
            const nextIdx = (themes.indexOf(current) + 1) % themes.length;
            UI.ThemeManager.setTheme(themes[nextIdx]);
            app.forceRedraw();
        } else if (key === "q" || key === "\u0003") {
            app.stop();
        } else {
            this.child.handleInput(key);
        }
    }
    public override handleMouse(ev: any) { this.child.handleMouse(ev); }
}

const finalRoot = new GlobalHandler(root);
const { columns, rows } = process.stdout;
finalRoot.resize(0, 0, columns, rows);

console.clear();
console.log(chalk.cyan("Launching Interactive TUI Demo..."));
setTimeout(() => app.run(finalRoot), 500);

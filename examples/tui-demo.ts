import { UI } from "../src";

// Mock data to match user request
const tools = [
  { label: "QDRant", value: "qdrant", description: "Vector database using QDRant" },
  { label: "Cloudflare Vectorize", value: "vectorize", description: "Cloudflare vector storage" },
  { label: "Postgres", value: "postgres", description: "SQL database" },
  { label: "Redis", value: "redis", description: "Key-value store" },
  { label: "Ollama", value: "ollama", description: "Local LLM inference" },
  { label: "OpenAI", value: "openai", description: "OpenAI API integration" },
  { label: "Anthropic", value: "anthropic", description: "Claude API integration" },
];

const toolDetails: Record<string, string> = {
  qdrant: `Capability: store/vectors (2 tools)
Tags: storage, vectors, embeddings, search, qdrant, local
────────────────────────────────────────
Tool: QDRant
Vector database using QDRant with similarity search
Provider: qdrant
Platforms: edge,node
Methods: get, query, upsert, queryById, delete, describe

Method Signatures:
────────────────────
get
  Inputs:
    ids*: string[]
      Array of vector IDs to retrieve
  Outputs:
    vectors: ({ | id: string | values: number[] | } | null)[]
      Array of vectors, null for IDs not found
────────────────────
query
  Inputs:
    queryVector*: number[]
      Query vector for similarity search
    topK*: int
      Number of results to return
    extras?: object
      Additional parameters passed to provider
  Outputs:
    results: Array<
        {
          id: string
          score: number
          values: number[]
          metadata?: object
        }
      >
`,
  vectorize: `Capability: store/vectors
Tags: storage, vectors, cloudflare
────────────────────────────────────────
Tool: Cloudflare Vectorize
Vector database on the edge.
`,
  postgres: `Capability: store/sql
Tags: storage, sql, postgres
────────────────────────────────────────
Tool: Postgres
Relational database interface.
`,
   redis: `Capability: store/kv
Tags: storage, kv, cache
────────────────────────────────────────
Tool: Redis
Fast in-memory key-value store.
`,
   ollama: `Capability: ai/llm
Tags: ai, llm, local
────────────────────────────────────────
Tool: Ollama
Local LLM runner.
`,
   openai: `Capability: ai/llm
Tags: ai, llm, cloud
────────────────────────────────────────
Tool: OpenAI
GPT-4o and other models.
`,
   anthropic: `Capability: ai/llm
Tags: ai, llm, cloud
────────────────────────────────────────
Tool: Anthropic
Claude 3.5 Sonnet and other models.
`
};


const app = new UI.App();

const detailsArea = new UI.ScrollArea({
    content: toolDetails["qdrant"] || "",
    id: "details"
});

const list = new UI.List({
    items: tools,
    id: "tools",
    onSelect: (item) => {
        const details = toolDetails[item.value] || "No details available.";
        detailsArea.setContent(details);
    }
});


const layout = new UI.SplitLayout({
    direction: "horizontal",
    first: list,
    second: detailsArea,
    splitRatio: 0.3
});

console.log("Starting TUI Demo... Press Esc or Ctrl+C to exit.");
// Small delay to let user see the log before raw mode takes over
setTimeout(() => {
    app.run(layout);
}, 1000);

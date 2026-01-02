/**
 * OpenTUI v2 Demo Application
 * 
 * Demonstrates the new TUI framework capabilities including:
 * - Master-Detail Layout
 * - Drill-down Navigation
 * - Custom Themes
 * - Shortcuts
 * - Toast Notifications
 * 
 * Run with: bun run examples/tui-demo-v2.tsx
 */

import { createSignal, createEffect } from "solid-js";
import { 
  createTuiApp, 
  MasterDetailLayout, 
  DrillDownNavigator, 
  Card, 
  StatCard, 
  MarkdownBlock,
  Button,
  useToast,
  useTheme,
  useShortcuts
} from "../src/tui/index"; // Import directly from source for demo

// -- Mock Data --

interface TraceStep {
  id: string;
  name: string;
  duration: number;
  status: "success" | "error";
  details: string;
}

interface Trace {
  id: string;
  name: string;
  timestamp: string;
  steps: TraceStep[];
}

const TRACES: Trace[] = [
  {
    id: "tr_1",
    name: "User Login Flow",
    timestamp: "2023-10-25 10:30:00",
    steps: [
      { id: "s1", name: "Auth Check", duration: 150, status: "success", details: "User authenticated via JWT" },
      { id: "s2", name: "Fetch Profile", duration: 45, status: "success", details: "Retrieved profile data for user_123" },
    ]
  },
  {
    id: "tr_2",
    name: "Payment Processing",
    timestamp: "2023-10-25 10:35:12",
    steps: [
      { id: "s3", name: "Validate Card", duration: 200, status: "success", details: "Card valid" },
      { id: "s4", name: "Charge", duration: 1200, status: "error", details: "Gateway timeout" },
    ]
  },
  {
    id: "tr_3",
    name: "Background Job",
    timestamp: "2023-10-25 11:00:00",
    steps: Array.from({ length: 20 }).map((_, i) => ({
      id: `job_${i}`,
      name: `Process Item ${i}`,
      duration: 10 + Math.random() * 50,
      status: Math.random() > 0.9 ? "error" : "success",
      details: `Processed item ${i} in batch`
    }))
  }
];

// -- Components --

function TraceDetail(props: { trace: Trace }) {
  const toast = useToast();
  
  const handleCopy = () => {
    // In real app, this would use clipboard
    toast.success("Trace ID copied to clipboard!");
  };

  return (
    <box flexDirection="column" gap={1} padding={1}>
      <Card title="Trace Info" padding={1}>
        <box flexDirection="column">
          <text style={{ bold: true }}>ID: {props.trace.id}</text>
          <text>Name: {props.trace.name}</text>
          <text>Time: {props.trace.timestamp}</text>
          <box marginTop={1}>
            <Button label="Copy ID" onClick={handleCopy} variant="primary" />
          </box>
        </box>
      </Card>
      
      <text style={{ bold: true, underline: true }}>Steps ({props.trace.steps.length})</text>
      
      <box flexDirection="column" gap={0} overflow="scroll" flexGrow={1}>
        {props.trace.steps.map(step => (
          <box 
            borderStyle="single" 
            borderColor={step.status === "error" ? "red" : "green"}
            padding={0}
            flexDirection="column"
          >
            <box flexDirection="row" justifyContent="space-between">
              <text style={{ bold: true }}> {step.name} </text>
              <text style={{ fg: step.status === "error" ? "red" : "green" }}>{step.status.toUpperCase()} </text>
            </box>
            <text style={{ fg: "gray" }}> Duration: {Math.floor(step.duration)}ms</text>
            <text> {step.details}</text>
          </box>
        ))}
      </box>
    </box>
  );
}

function TraceList(props: { onSelect: (trace: Trace) => void }) {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const { current } = useTheme();

  // Handle keyboard navigation for list
  const handleKey = (e: { key: string }) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex(prev => Math.min(prev + 1, TRACES.length - 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      props.onSelect(TRACES[selectedIndex()]);
    }
  };

  return (
    <box 
      flexDirection="column" 
      width="100%" 
      height="100%" 
      onKeyDown={handleKey}
    >
      <text style={{ bold: true, bg: current().colors.background, fg: current().colors.accent }}>
         Available Traces (Use Arrows + Enter) 
      </text>
      {TRACES.map((trace, i) => (
        <box 
          height={1}
          style={{ 
            bg: i === selectedIndex() ? current().colors.selection : undefined,
            fg: i === selectedIndex() ? current().colors.text : current().colors.muted
          }}
        >
          <text> {trace.timestamp} - {trace.name} </text>
        </box>
      ))}
    </box>
  );
}

function Dashboard() {
  const { current, cycle } = useTheme();
  const { register } = useShortcuts();
  const toast = useToast();

  // Register global shortcuts
  createEffect(() => {
    register({
      key: "ctrl+t",
      action: () => {
        cycle();
        toast.info(`Theme: ${current().name}`);
      },
      description: "Cycle Theme"
    });
  });

  return (
    <DrillDownNavigator>
      {(nav) => (
        <box flexDirection="column" width="100%" height="100%">
          {/* Header */}
          <box height={3} borderStyle="single" padding={0} justifyContent="center" alignItems="center">
             <text style={{ bold: true, fg: current().colors.accent }}> OpenTUI Trace Viewer v2 </text>
          </box>

          {/* Stats Row */}
          <box height={6} flexDirection="row" gap={1}>
            <StatCard label="Total Traces" value={TRACES.length} width="33%" />
            <StatCard label="Avg Duration" value={145} format="number" width="33%" trend="up" />
            <StatCard label="Error Rate" value={0.05} format="percent" width="33%" trend="down" />
          </box>

          {/* Main Content */}
          <box flexGrow={1} borderStyle="double" title=" Explorer ">
            <MasterDetailLayout
              masterWidth="40%"
              master={
                <TraceList onSelect={(trace) => {
                  // Drill down navigation
                  nav.push(() => <TraceDetail trace={trace} />);
                }} />
              }
              detail={
                <box justifyContent="center" alignItems="center" height="100%">
                  <MarkdownBlock content="Select a trace to view details.\n\nKey bindings:\n- **Arrows**: Navigate list\n- **Enter**: Select/Drill down\n- **Esc**: Go Back\n- **Ctrl+T**: Cycle Theme" />
                </box>
              }
            />
          </box>
          
          {/* Footer */}
          <box height={1} bg={current().colors.selection}>
             <text> Ctrl+C: Quit | Ctrl+T: Theme | Arrows: Navigate </text>
          </box>
        </box>
      )}
    </DrillDownNavigator>
  );
}

// -- Entry Point --

createTuiApp(() => <Dashboard />, {
  theme: "dark",
  shortcuts: [
    { key: "q", action: () => process.exit(0), description: "Quit" }
  ]
}).catch(console.error);

#!/usr/bin/env bun
import { ChildProcess, spawn } from "node:child_process";
import path from "node:path";
// import { z } from "zod"; // Used in commented schema examples
import { ArgParser } from "../src";
import type { IFlag, IHandlerContext } from "../src";
import type {
  IParseExecutionResult,
} from "../src/mcp/mcp-integration";

export interface IFzfSearchResult {
  files: string[];
  error?: string;
  commandExecuted?: string;
  stderrOutput?: string;
}

async function fzfSearchCommandHandler(
  ctx: IHandlerContext<{
    query: string;
    directory: string;
    extensions?: string;
    maxResults: number;
  }>,
): Promise<IFzfSearchResult> {
  const { query, directory, maxResults } = ctx.args;
  const extensionsArray = ctx.args.extensions
    ? ctx.args.extensions
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e)
    : [];

  const resolvedDirectory = path.resolve(directory);
  const findArgs: string[] = [resolvedDirectory];

  if (extensionsArray.length > 0) {
    findArgs.push("-type", "f");
    if (extensionsArray.length > 1) {
      findArgs.push("(");
    }
    extensionsArray.forEach((ext, index) => {
      if (index > 0) {
        findArgs.push("-o");
      }
      findArgs.push("-name", `*.${ext.replace(/^\./, "")}`);
    });
    if (extensionsArray.length > 1) {
      findArgs.push(")");
    }
  } else {
    findArgs.push("-type", "f");
  }

  const fzfCliArgs: string[] = [
    `--filter=${query}`,
    "--height=1%",
    "--no-sort",
  ];

  const commandToLogParts = [
    `find ${findArgs.join(" ")}`,
    `fzf ${fzfCliArgs.join(" ")}`,
  ];
  if (maxResults > 0) {
    commandToLogParts.push(`head -n ${maxResults}`);
  }
  const commandToLog = commandToLogParts.join(" | ");

  let stdoutData = "";
  let stderrData = "";

  return new Promise<IFzfSearchResult>((resolve) => {
    let findProcess: ChildProcess | null = null;
    let fzfProcess: ChildProcess | null = null;
    let headProcess: ChildProcess | null = null;
    let lastOutputProcess: ChildProcess | null = null;

    let criticalErrorResolved = false;

    const killProcesses = (signal?: NodeJS.Signals | number) => {
      if (headProcess && !headProcess.killed) headProcess.kill(signal);
      if (fzfProcess && !fzfProcess.killed) fzfProcess.kill(signal);
      if (findProcess && !findProcess.killed) findProcess.kill(signal);
    };

    const handleProcessError = (
      processName: string,
      err: Error,
      isSpawnError = false,
    ) => {
      if (criticalErrorResolved) return;
      criticalErrorResolved = true;
      killProcesses();
      resolve({
        files: [],
        error: `${
          isSpawnError
            ? `Failed to start '${processName}' process`
            : `'${processName}' process error`
        }: ${err.message}. Is '${processName}' installed and in PATH?`,
        commandExecuted: commandToLog,
        stderrOutput: stderrData.trim() || undefined,
      });
    };

    findProcess = spawn("find", findArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    findProcess.on("error", (err) => handleProcessError("find", err, true));
    findProcess.stderr?.on("data", (data) => {
      stderrData += data.toString();
    });

    fzfProcess = spawn("fzf", fzfCliArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    fzfProcess.on("error", (err) => handleProcessError("fzf", err, true));
    fzfProcess.stderr?.on("data", (data) => {
      stderrData += data.toString();
    });

    if (findProcess.stdout && fzfProcess.stdin) {
      findProcess.stdout.pipe(fzfProcess.stdin);
      findProcess.stdout.on("error", (err) =>
        handleProcessError("find (stdout piping)", err),
      );
      fzfProcess.stdin.on("error", (err) => {
        if ((err as any).code === "EPIPE") {
          if (!findProcess?.killed) findProcess.kill();
        } else {
          handleProcessError("fzf (stdin piping)", err);
        }
      });
    } else {
      handleProcessError(
        "pipe setup",
        new Error("Failed to get stdout/stdin for find-fzf pipe."),
        true,
      );
      return;
    }

    lastOutputProcess = fzfProcess;

    if (maxResults > 0) {
      headProcess = spawn("head", ["-n", String(maxResults)], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      headProcess.on("error", (err) => handleProcessError("head", err, true));
      headProcess.stderr?.on("data", (data) => {
        stderrData += data.toString();
      });

      if (fzfProcess.stdout && headProcess.stdin) {
        fzfProcess.stdout.pipe(headProcess.stdin);
        fzfProcess.stdout.on("error", (err) =>
          handleProcessError("fzf (stdout piping to head)", err),
        );
        headProcess.stdin.on("error", (err) => {
          if ((err as any).code === "EPIPE") {
            if (!fzfProcess?.killed) fzfProcess.kill();
          } else {
            handleProcessError("head (stdin piping)", err);
          }
        });
      } else {
        handleProcessError(
          "pipe setup",
          new Error("Failed to get stdout/stdin for fzf-head pipe."),
          true,
        );
        return;
      }
      lastOutputProcess = headProcess;
    }

    if (lastOutputProcess && lastOutputProcess.stdout) {
      lastOutputProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });
      lastOutputProcess.stdout.on("error", (err) =>
        handleProcessError("last output process (stdout)", err),
      );
    } else if (!criticalErrorResolved) {
      handleProcessError(
        "output setup",
        new Error("Last output process stdout stream is not available."),
        true,
      );
      return;
    }

    let findExited = false,
      fzfExited = false,
      headExited = !(maxResults > 0);

    const tryResolve = () => {
      if (criticalErrorResolved) return;
      if (findExited && fzfExited && (headExited || maxResults <= 0)) {
        const files = stdoutData
          .split("\n")
          .map((f) =>
            f.startsWith(resolvedDirectory)
              ? f
              : path.join(
                  resolvedDirectory,
                  f.replace(`${resolvedDirectory}${path.sep}`, ""),
                ),
          )
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
        resolve({
          files,
          error: undefined,
          commandExecuted: commandToLog,
          stderrOutput: stderrData.trim() || undefined,
        });
      }
    };

    findProcess.on("exit", (code, signal) => {
      findExited = true;
      if (
        code !== 0 &&
        code !== null &&
        signal !== "SIGPIPE" &&
        !criticalErrorResolved
      ) {
      }
      tryResolve();
    });

    fzfProcess.on("exit", (code, signal) => {
      fzfExited = true;
      if (code === 2 && !criticalErrorResolved) {
        criticalErrorResolved = true;
        killProcesses();
        resolve({
          files: [],
          error: `fzf process exited with error code 2. Stderr: ${stderrData.trim()}`,
          commandExecuted: commandToLog,
          stderrOutput: stderrData.trim() || undefined,
        });
      } else if (
        code !== 0 &&
        code !== 1 &&
        code !== 130 &&
        signal !== "SIGPIPE" &&
        !criticalErrorResolved
      ) {
      }
      tryResolve();
    });

    if (headProcess) {
      headProcess.on("exit", (code, signal) => {
        headExited = true;
        if (
          code !== 0 &&
          code !== 141 &&
          code !== null &&
          signal !== "SIGPIPE" &&
          !criticalErrorResolved
        ) {
        }
        tryResolve();
      });
    } else {
      headExited = true;
    }
    tryResolve();
  });
}

const fzfSearchFlags: IFlag[] = [
  {
    name: "query",
    description: "The fuzzy search query.",
    options: ["--query", "-q"],
    type: "string",
    mandatory: true,
  },
  {
    name: "directory",
    description:
      "The base directory to search within. Defaults to current directory.",
    options: ["--directory", "-d"],
    type: "string",
    defaultValue: ".",
  },
  {
    name: "extensions",
    description:
      "Comma-separated list of file extensions to include (e.g., js,ts,md). No filter if omitted.",
    options: ["--extensions", "-e"],
    type: "string",
    defaultValue: "",
  },
  {
    name: "maxResults",
    description:
      "Maximum number of results to return. Set to 0 for unlimited (fzf default).",
    options: ["--max-results", "-m"],
    type: "number",
    defaultValue: 20,
  },
];

// Example output schema shape for fzf tool (for reference)
// const fzfToolOutputZodShape = {
//   files: z.array(z.string()).describe("A list of absolute file paths matching the query."),
//   error: z.string().optional().nullable().describe("An error message if the search operation failed."),
//   commandExecuted: z.string().optional().nullable().describe("The command string that was constructed and executed (for debugging)."),
//   stderrOutput: z.string().optional().nullable().describe("Captured standard error output from the command execution (for debugging or warnings)."),
// };

// Example default output schema shape (for reference)
// const defaultToolZodOutputShape = {
//   success: z.boolean().describe("Indicates if the command executed successfully."),
//   message: z.string().optional().nullable().describe("Optional message, often used for errors."),
//   data: z.any().optional().nullable().describe("Generic data payload if handler response doesn't match a specific schema."),
// };



const mainParser = new ArgParser<IFzfSearchResult>(
  {
    appName: "FZF File Search Utility",
    appCommandName: "fzf-search",
    description:
      "Performs fuzzy file searches using fzf. Run 'fzf-search mcp-server' to start as an MCP server.",
    handler: fzfSearchCommandHandler,
    handleErrors: false,
    throwForDuplicateFlags: true,
  },
  fzfSearchFlags,
).addMcpSubCommand("mcp-server", {
  name: "fzf-search-mcp-server",
  version: "0.1.0",
  description: "FZF Search MCP Server",
});

async function main() {
  const rawArgs = process.argv.slice(2);

  try {
    const parsed = (await mainParser.parse(
      rawArgs,
    )) as IParseExecutionResult & {
      $commandChain?: string[];
      handlerResponse?: IFzfSearchResult;
    };

    if (parsed.$error) {
      console.error(`Error: ${parsed.$error.message}`);
      if (parsed.$error.details) {
        console.error(`Details: ${JSON.stringify(parsed.$error.details)}`);
      }
      if (!rawArgs.includes("-h") && !rawArgs.includes("--help")) {
        process.exit(1);
      }
      return;
    }

    if (parsed.$commandChain && parsed.$commandChain.includes("mcp-server")) {
      return;
    }

    const result = parsed.handlerResponse;

    if (result) {
      if (result.error) {
        console.error(`Search Error: ${result.error}`);
      }

      if (result.files && result.files.length > 0) {
        result.files.forEach((file: string) => console.log(file));
      } else if (!result.error) {
        console.error("No files found matching your query.");
      }
    } else if (!parsed.$commandChain && !parsed["help"] && !parsed.$error) {
      console.error(
        "No command executed or no output. Use 'fzf-search --help' for usage.",
      );
    }
  } catch (error: any) {
    console.error(`CLI Execution Failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error in main execution:", error);
  process.exit(1);
});

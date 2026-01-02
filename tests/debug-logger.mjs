import { createMcpLogger } from "@alcyone-labs/simple-mcp-logger";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

async function run() {
    const file = path.join(os.tmpdir(), `debug-log-${Date.now()}.log`);
    console.log("Log file:", file);
    
    // Test direct logger usage
    const logger = createMcpLogger({
        logToFile: file,
        prefix: "DEBUG"
    });
    
    logger.info("Test message 1");
    // force some async delay
    await new Promise(r => setTimeout(r, 100));
    
    await logger.close();
    
    if (fs.existsSync(file)) {
        console.log("File content:", fs.readFileSync(file, "utf8"));
    } else {
        console.log("File does not exist!");
    }
}

run();

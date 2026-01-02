#!/usr/bin/env node
import { z } from "zod";
import { ArgParser } from "../src/index.js";

// Define complex Zod schemas for structured JSON input
const DatabaseConfigSchema = z.object({
  host: z.string().describe("Database host address"),
  port: z.number().min(1).max(65535).describe("Database port number"),
  database: z.string().describe("Database name"),
  credentials: z
    .object({
      username: z.string().describe("Database username"),
      password: z.string().describe("Database password"),
    })
    .describe("Database credentials"),
  ssl: z.boolean().optional().describe("Enable SSL connection"),
  poolSize: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Connection pool size"),
});

const ApiConfigSchema = z.object({
  baseUrl: z.string().url().describe("Base API URL"),
  apiKey: z.string().min(1).describe("API authentication key"),
  timeout: z
    .number()
    .min(1000)
    .max(30000)
    .default(5000)
    .describe("Request timeout in milliseconds"),
  retries: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe("Number of retry attempts"),
  endpoints: z.array(z.string()).describe("Available API endpoints"),
  features: z
    .array(z.enum(["auth", "logging", "metrics", "caching"]))
    .describe("Enabled features"),
});

const DeploymentConfigSchema = z.object({
  environment: z
    .enum(["development", "staging", "production"])
    .describe("Deployment environment"),
  region: z.string().describe("Deployment region"),
  scaling: z
    .object({
      minInstances: z.number().min(1).describe("Minimum number of instances"),
      maxInstances: z.number().min(1).describe("Maximum number of instances"),
      targetCpu: z
        .number()
        .min(10)
        .max(100)
        .describe("Target CPU utilization percentage"),
    })
    .describe("Auto-scaling configuration"),
  monitoring: z
    .object({
      enabled: z.boolean().describe("Enable monitoring"),
      alertEmail: z.string().email().optional().describe("Email for alerts"),
      metrics: z.array(z.string()).describe("Metrics to collect"),
    })
    .describe("Monitoring configuration"),
});

// Create CLI with Zod schema flags
const cli = ArgParser.withMcp({
  appName: "Advanced Configuration CLI",
  appCommandName: "config-cli",
  description:
    "A CLI that demonstrates Zod schema flags for structured JSON input",
  mcp: {
    serverInfo: {
      name: "config-cli-mcp-server",
      version: "1.0.0",
      description:
        "MCP server for configuration management with structured JSON validation",
    },
  },
})
  .addTool({
    name: "setup-database",
    description: "Configure database connection with structured validation",
    flags: [
      {
        name: "config",
        options: ["--config", "-c"],
        type: DatabaseConfigSchema,
        description: "Database configuration as JSON object",
        mandatory: true,
      },
      {
        name: "dry-run",
        options: ["--dry-run"],
        type: "boolean",
        flagOnly: true,
        description: "Validate configuration without applying changes",
      },
    ],
    outputSchema: {
      success: z
        .boolean()
        .describe("Whether the database setup was successful"),
      connectionString: z
        .string()
        .describe("Generated database connection string"),
      poolInfo: z
        .object({
          size: z.number(),
          active: z.number(),
          idle: z.number(),
        })
        .describe("Connection pool information"),
    },
    handler: async (ctx) => {
      const { config, dryRun } = ctx.args;

      console.log("🗄️  Database Configuration:");
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   Username: ${config.credentials.username}`);
      console.log(`   SSL: ${config.ssl ? "enabled" : "disabled"}`);
      console.log(`   Pool Size: ${config.poolSize}`);

      if (dryRun) {
        console.log("🔍 Dry run mode - configuration validated successfully!");
        return {
          success: true,
          connectionString: `postgresql://${config.credentials.username}:***@${config.host}:${config.port}/${config.database}`,
          poolInfo: { size: config.poolSize, active: 0, idle: 0 },
        };
      }

      // Simulate database setup
      console.log("⚙️  Setting up database connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("✅ Database setup completed!");

      return {
        success: true,
        connectionString: `postgresql://${config.credentials.username}:***@${config.host}:${config.port}/${config.database}`,
        poolInfo: {
          size: config.poolSize,
          active: 2,
          idle: config.poolSize - 2,
        },
      };
    },
  })
  .addTool({
    name: "configure-api",
    description: "Configure API client with comprehensive validation",
    flags: [
      {
        name: "config",
        options: ["--config", "-c"],
        type: ApiConfigSchema,
        description: "API configuration as JSON object",
        mandatory: true,
      },
    ],
    outputSchema: {
      success: z
        .boolean()
        .describe("Whether the API configuration was successful"),
      clientId: z.string().describe("Generated API client ID"),
      endpoints: z.array(z.string()).describe("Configured API endpoints"),
      features: z.array(z.string()).describe("Enabled features"),
    },
    handler: async (ctx) => {
      const { config } = ctx.args;

      console.log("🌐 API Configuration:");
      console.log(`   Base URL: ${config.baseUrl}`);
      console.log(`   Timeout: ${config.timeout}ms`);
      console.log(`   Retries: ${config.retries}`);
      console.log(`   Endpoints: ${config.endpoints.join(", ")}`);
      console.log(`   Features: ${config.features.join(", ")}`);

      // Simulate API client setup
      console.log("⚙️  Configuring API client...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log("✅ API client configured!");

      return {
        success: true,
        clientId: `client_${Date.now()}`,
        endpoints: config.endpoints,
        features: config.features,
      };
    },
  })
  .addTool({
    name: "deploy",
    description: "Deploy application with complex deployment configuration",
    flags: [
      {
        name: "config",
        options: ["--config", "-c"],
        type: DeploymentConfigSchema,
        description: "Deployment configuration as JSON object",
        mandatory: true,
      },
      {
        name: "force",
        options: ["--force", "-f"],
        type: "boolean",
        flagOnly: true,
        description: "Force deployment even if validation warnings exist",
      },
    ],
    outputSchema: {
      success: z.boolean().describe("Whether the deployment was successful"),
      deploymentId: z.string().describe("Unique deployment identifier"),
      environment: z.string().describe("Target environment"),
      instances: z
        .object({
          requested: z.number(),
          running: z.number(),
          healthy: z.number(),
        })
        .describe("Instance status information"),
    },
    handler: async (ctx) => {
      const { config, force } = ctx.args;

      console.log("🚀 Deployment Configuration:");
      console.log(`   Environment: ${config.environment}`);
      console.log(`   Region: ${config.region}`);
      console.log(
        `   Scaling: ${config.scaling.minInstances}-${config.scaling.maxInstances} instances`,
      );
      console.log(`   Target CPU: ${config.scaling.targetCpu}%`);
      console.log(
        `   Monitoring: ${config.monitoring.enabled ? "enabled" : "disabled"}`,
      );

      if (config.monitoring.enabled) {
        console.log(
          `   Alert Email: ${config.monitoring.alertEmail || "not configured"}`,
        );
        console.log(`   Metrics: ${config.monitoring.metrics.join(", ")}`);
      }

      // Simulate deployment
      console.log("⚙️  Starting deployment...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("✅ Deployment completed!");

      return {
        success: true,
        deploymentId: `deploy_${Date.now()}`,
        environment: config.environment,
        instances: {
          requested: config.scaling.minInstances,
          running: config.scaling.minInstances,
          healthy: config.scaling.minInstances,
        },
      };
    },
  });

// Add main handler for help and general info
cli.handler = async (ctx) => {
  console.log("🎯 Advanced Configuration CLI");
  console.log(
    "This CLI demonstrates Zod schema flags for structured JSON input validation.",
  );
  console.log("");
  console.log("Available commands:");
  console.log("  setup-database  - Configure database with structured JSON");
  console.log("  configure-api   - Configure API client with validation");
  console.log("  deploy          - Deploy with complex configuration");
  console.log("");
  console.log("Example usage:");
  console.log(
    '  config-cli setup-database --config \'{"host":"localhost","port":5432,"database":"myapp","credentials":{"username":"admin","password":"secret"},"ssl":true}\'',
  );
  console.log("");
  console.log("For MCP mode: config-cli --s-mcp-serve");

  return { success: true, message: "Help displayed" };
};

// Export for use as a module or run directly
export default cli;

if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse().catch(console.error);
}

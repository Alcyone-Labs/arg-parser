import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ArgParser } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, "../package.json");

const parser = new ArgParser({
  appName: "Version Bumper",
  appCommandName: "bump",
  handler: async (ctx) => {
    const { major, minor, patch } = ctx.args;

    if (!major && !minor && !patch) {
      console.error("Error: You must specify --major, --minor, or --patch");
      process.exit(1);
    }

    if ((major && minor) || (major && patch) || (minor && patch)) {
      console.error(
        "Error: Please specify only one of --major, --minor, or --patch",
      );
      process.exit(1);
    }

    const { dryRun } = ctx.args;

    const pkgContent = fs.readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    const currentVersion = pkg.version;

    if (!currentVersion) {
      console.error("Error: No version found in package.json");
      process.exit(1);
    }

    const parts = currentVersion.split(".");
    if (parts.length !== 3) {
      console.error(`Error: Version ${currentVersion} is not semantic (x.y.z)`);
      process.exit(1);
    }

    const [ma, mi, pa] = parts.map(Number);

    let newVersion = "";
    if (major) {
      newVersion = `${ma + 1}.0.0`;
    } else if (minor) {
      newVersion = `${ma}.${mi + 1}.0`;
    } else if (patch) {
      newVersion = `${ma}.${mi}.${pa + 1}`;
    }

    if (dryRun) {
      console.log(
        `[Dry Run] Would update version from ${currentVersion} to ${newVersion}`,
      );
      return { newVersion };
    }

    pkg.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

    console.log(
      `\x1b[32m✔\x1b[0m Updated version from \x1b[33m${currentVersion}\x1b[0m to \x1b[32m${newVersion}\x1b[0m`,
    );
    return { newVersion };
  },
});

parser.addFlags([
  {
    name: "dryRun",
    description: "Simulate the version bump",
    options: ["--dry-run"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "major",
    description: "Bump major version (X.0.0)",
    options: ["--major"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "minor",
    description: "Bump minor version (x.Y.0)",
    options: ["--minor"],
    type: "boolean",
    flagOnly: true,
  },
  {
    name: "patch",
    description: "Bump patch version (x.y.Z)",
    options: ["--patch"],
    type: "boolean",
    flagOnly: true,
  },
]);

// Handle execution
const run = async () => {
  try {
    const result = await parser.parse(process.argv.slice(2));
    if (result._asyncHandlerPromise) {
      await result._asyncHandlerPromise;
    }
  } catch (error: any) {
    console.error(error.message || error);
    process.exit(1);
  }
};

run();

#!/usr/bin/env bun
import chalk from "chalk";
import { ArgParser } from "../dist/index.js";

const argParser = new ArgParser(
  {
    appName: "ArgParser Sample CLI 2",
    appCommandName: "sample-cli-2", // <-- Add this line if you use a script name under package.json .bin property so it displays in the command line help
    description: "A sample, testable CLI to show how the APIs work",
    // handleErrors: true, // Default, no need to specify unless setting to false
    //
    // The handler below is for the root command. It will execute if no sub-commands are matched.
    // If you remove the root handler, invoking the script without arguments will automatically display help.
    handler: () => {
      console.log("This is the root handler");
    },
    subCommands: [
      {
        name: "sub1",
        description: "Sub 1 command",
        parser: new ArgParser({}, [
          {
            name: "sub1Flag1",
            description: "Sub 1 Flag 1",
            options: ["--one", "-1"],
          },
          {
            name: "sub1Flag2",
            description: "Sub 1 Flag 2",
            options: ["--two", "-2"],
          },
        ]),
      },
      {
        name: "sub2",
        description: "Sub 2 command",
        parser: new ArgParser(
          {
            // Define sub-commands correctly within the subCommands array
            subCommands: [
              {
                name: "verboseSub",
                description: "A verbose sub-command of sub2",
                handler: (ctx) => {
                  console.log(
                    "Command Chain followed to get here",
                    ctx.commandChain,
                  );
                  console.log("parentArgs: ", ctx.parentArgs);
                  console.log("args found: ", ctx.args);
                },
                parser: new ArgParser({}, [
                  {
                    name: "verbose",
                    description: [
                      "Enable verbose mode",
                      "This will display on a second line",
                    ],
                    options: ["-v"],
                    flagOnly: true,
                    default: false,
                    mandatory: true,
                    type: (value: string) => {
                      return Number(value.replaceAll(/[^\d]/g, ""));
                    },
                  },
                  {
                    name: "kebab-case-name",
                    description: [
                      "Some more flag",
                      "It will come out as args['kebab-case-name']",
                      "This will display on a third line",
                    ],
                    options: ["--kebab-case", "-kc"],
                    enum: ["yes", "no"],
                    default: "no",
                    mandatory: true,
                    type: "string",
                    // Example validation returning a custom string message
                    validate: (value) => {
                      if (value === "maybe") {
                        return `Value '${value}' is not allowed for ${chalk.yellow("kebab-case-name")}. Choose 'yes' or 'no'.`;
                      }
                      return true; // Or return void/true for valid
                    },
                  },
                ]),
              },
            ],
          },
          [
            {
              name: "sub2Flag1",
              description: "Sub 2 Flag 1",
              options: ["--one", "-1"],
              flagOnly: true,
              allowMultiple: true,
            },
            {
              name: "sub2Flag2",
              description: "Sub 2 Flag 2",
              options: ["--two", "-2"],
              flagOnly: true,
            },
            {
              name: "sub2Flag3",
              description: "Sub 2 Flag 3",
              options: ["--three", "-3"],
              flagOnly: true,
            },
          ],
        ),
      },
      {
        name: "sub3",
        description: "Sub 3 command",
        handler: (ctx) => {
          console.log("This will only trigger if we query $ script sub3");
          console.log("Command Chain followed to get here", ctx.commandChain);
          console.log("parentArgs: ", ctx.parentArgs);
          console.log("args found: ", ctx.args);
        },
        parser: new ArgParser({}, [
          {
            name: "sub3Flag1",
            description: "Sub 3 Flag 1",
            options: ["--one", "-1"],
            flagOnly: true,
            type: Boolean,
            mandatory: true,
          },
          {
            name: "sub3Flag2",
            description: "Sub 3 Flag 2",
            options: ["--two", "-2"],
            flagOnly: true,
            type: Boolean,
          },
          {
            name: "sub3Flag3",
            description: "Sub 3 Flag 3, pass a string",
            options: ["--three", "-3"],
            type: String,
          },
        ]),
      },
    ],
  },
  [
    {
      name: "verbose",
      description: "Enable verbose mode",
      options: ["-v"],
      default: false,
      flagOnly: true,
      type: "boolean",
    },
  ],
);

// Directly call parse - errors handled internally by default
const args = argParser.parse(process.argv.slice(2));

// Success Logging:
// The ArgParser.parse() method returns the parsed arguments.
// By default, if a handler is defined for the matched command (root or sub-command), it will be executed.
// The $commandChain property in the returned 'args' indicates the path to the command whose handler was executed.

console.log("Final parsed args: ", args); // Log the raw parsed arguments

if (args.$commandChain && args.$commandChain.length > 0) {
  // A sub-command was matched and its handler executed.
  // The sub-command's handler would have printed its own output.
  console.log(
    chalk.green("Parsing complete."),
    "Handler executed for sub-command:",
    chalk.cyan(args.$commandChain.join(" -> ")),
  );
} else {
  // No sub-command was matched, so the root command was targeted.
  // Since this script defines a root handler (which prints "Coucou"), that handler executed.
  console.log(chalk.green("Parsing complete. Root handler executed."));
}

/** @type {import('prettier').Config} */
const prettierConfig = {
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "<BUILTIN_MODULES>",
    "^[^@#~\.].*",
    "<THIRD_PARTY_MODULES>",
    "^#(/.*)$",
    "^[.]",
  ],
  overrides: [
    {
      files: "**/*.test.ts",
      options: {
        importOrder: [
          "^vitest",
          "<BUILTIN_MODULES>",
          "^[^@#~\.].*",
          "<THIRD_PARTY_MODULES>",
          "^#(/.*)$",
          "^[.]",
        ],
      },
    },
  ],
};

const config = {
  ...prettierConfig,
};

export default config;

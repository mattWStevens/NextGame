import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Ignore build outputs and node_modules
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },

  // Base JS rules for all files
  js.configs.recommended,

  // TypeScript strict rules for all TS/TSX files
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Language options and parser config for all TS files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["apps/api/prisma.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Web workspace: React hooks + React Refresh rules
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // API workspace: Node.js globals
  {
    files: ["apps/api/src/**/*.ts"],
    languageOptions: {
      globals: {
        // Node.js globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
  },

  // Shared package: Node.js globals
  {
    files: ["packages/shared/src/**/*.ts"],
    languageOptions: {
      globals: {
        console: "readonly",
      },
    },
  },

  // Allow _-prefixed variables to be intentionally unused (e.g. destructuring)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);

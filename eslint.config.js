import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh - keep disabled for flexibility
      "react-refresh/only-export-components": "off",
      
      // TypeScript Rules - Gradually enable for better type safety
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn", // Changed from "off" to "warn"
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      
      // General Rules
      "no-useless-escape": "off",
      "no-case-declarations": "off",
      
      // React Hooks Rules - Critical for React correctness
      "react-hooks/rules-of-hooks": "error", // Changed from "warn" to "error"
      "react-hooks/exhaustive-deps": "warn", // Keep as warn for now, will change to error later
    },
  },
);

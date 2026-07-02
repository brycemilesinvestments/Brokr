import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import {
  projectStructureParser,
  projectStructurePlugin,
} from "eslint-plugin-project-structure";
import { folderStructureConfig } from "./folderStructure.mjs";
import { independentModulesConfig } from "./independentModules.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**"],
    ignores: ["projectStructure.cache.json"],
    languageOptions: { parser: projectStructureParser },
    plugins: {
      "project-structure": projectStructurePlugin,
    },
    rules: {
      "project-structure/folder-structure": ["error", folderStructureConfig],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    plugins: {
      "project-structure": projectStructurePlugin,
    },
    rules: {
      "project-structure/independent-modules": ["error", independentModulesConfig],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

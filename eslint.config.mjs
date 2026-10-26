import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pulse from "./eslint-plugin-pulse.mjs";

/**
 * Globs that have been migrated to the Quiet Keycap design system.
 * Files here fail the build on off-system styling or copy.
 * Everything else only warns until its phase lands.
 */
const MIGRATED = ["app/**/*.tsx", "components/**/*.tsx"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["app/(dev)/**", "emails/**", "lib/**"],
    plugins: { pulse },
    rules: {
      "pulse/no-raw-style": "warn",
      "pulse/no-raw-copy": "warn",
    },
  },
  ...(MIGRATED.length
    ? [
        {
          files: MIGRATED,
          plugins: { pulse },
          rules: {
            "pulse/no-raw-style": "error",
            "pulse/no-raw-copy": "error",
          },
        },
      ]
    : []),
]);

export default eslintConfig;

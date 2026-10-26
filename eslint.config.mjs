import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pulse from "./eslint-plugin-pulse.mjs";

const MIGRATED = ["app/**/*.tsx", "components/**/*.tsx"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([

    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["emails/**", "lib/**"],
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

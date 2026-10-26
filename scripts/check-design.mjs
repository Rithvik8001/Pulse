#!/usr/bin/env node
/**
 * Design-system check that ESLint cannot express: CSS files, string
 * literals outside JSX, and the token region of globals.css.
 *
 * Prints file:line: message. Exits 1 only in strict mode
 * (DESIGN_STRICT=1), which the final phase of the rewrite turns on.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const STRICT = process.env.DESIGN_STRICT === "1";
const SCAN_DIRS = ["app", "components"];
const SKIP_DIRS = new Set(["node_modules", ".next", "(dev)"]);
const EXT = /\.(tsx|css)$/;

const RULES = [
  { re: /#[0-9a-f]{3,8}\b/i, msg: "raw hex colour outside tokens", css: true, tsx: true },
  { re: /font-size:\s*\d+px/, msg: "px font size", css: true, tsx: false },
  { re: /(?<![\w-])\d+px\b/, msg: "px value outside tokens", css: true, tsx: false },
  { re: /[—→←❤✍♥]/u, msg: "em dash, arrow or glyph in copy", css: false, tsx: true },
  { re: /\p{Extended_Pictographic}/u, msg: "emoji in copy", css: false, tsx: true },
  { re: /[A-Za-z]!["'`]/, msg: "exclamation mark in copy", css: false, tsx: true },
  { re: /"[A-Z]{3,}"/, msg: "ALL CAPS string literal", css: false, tsx: true },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* files(full);
    else if (EXT.test(name)) yield full;
  }
}

let findings = 0;

for (const dir of SCAN_DIRS) {
  for (const file of files(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    const isCss = file.endsWith(".css");
    const lines = readFileSync(file, "utf8").split("\n");
    let inTokens = false;
    lines.forEach((line, i) => {
      if (line.includes("tokens:start")) inTokens = true;
      if (line.includes("tokens:end")) inTokens = false;
      if (inTokens) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (line.includes("design-ok")) return;
      for (const rule of RULES) {
        if (isCss ? !rule.css : !rule.tsx) continue;
        if (rule.re.test(line)) {
          findings += 1;
          console.log(`${rel}:${i + 1}: ${rule.msg}`);
        }
      }
    });
  }
}

if (findings) {
  console.log(`\n${findings} design finding${findings === 1 ? "" : "s"}${STRICT ? "" : " (warnings)"}`);
}
process.exit(STRICT && findings ? 1 : 0);

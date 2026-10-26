#!/usr/bin/env node
/**
 * After the strict theme flip, Tailwind silently drops classes it does not
 * know. This lists class-like tokens in app/ and components/ that have no
 * rule in the built CSS. Run after `bun run build`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function* files(dir, ext) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full, ext);
    else if (ext.test(name)) yield full;
  }
}

const css = [...files(".next/static", /\.css$/)].map((f) => readFileSync(f, "utf8")).join("\n");
const STATIC = new Set(["grid","flex","hidden","block","inline","contents","truncate","invisible","relative","absolute","fixed","sticky","isolate","underline","italic","uppercase","border","shrink-0","list-none","sr-only","tabular-nums","text-balance","text-pretty","text-center","text-left","text-right","whitespace-nowrap","whitespace-pre-wrap","overflow-hidden","overflow-y-auto","overflow-x-auto","overscroll-contain","not-italic","outline-none","select-none","pointer-events-none","cursor-default","resize-none","ring-2","outline-1","inline-flex","inline-grid","inline-block","flex-1","flex-wrap","flex-col","grow","col-start-1","row-start-1","grid-flow-col","grid-rows-7","list-disc","list-decimal","justify-end","justify-start","justify-center","justify-between","justify-items-center","justify-items-end","justify-items-start","justify-self-end","justify-self-start","items-center","items-start","items-end","items-stretch","items-baseline","content-start","content-center","self-start","transition-colors","transition-transform","transition-opacity","font-medium","font-semibold","text-ink","w-full","h-full","min-w-0","max-w-full","size-full","gap-px","h-px","w-px"]);

const escapeClass = (t) => t.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
const seen = new Map();
for (const dir of ["app", "components"]) {
  for (const file of files(dir, /\.tsx$/)) {
    if (file.includes("(dev)")) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:"|'|`)([^"'`]*)(?:"|'|`)/g)) {
      for (const tok of m[1].split(/\s+/)) {
        if (!tok || tok.length < 3) continue;
        if (!/^[a-z!-][\w:/.()%\[\]-]*$/.test(tok)) continue;
        if (!/[-:\[(]/.test(tok) && !STATIC.has(tok)) continue;
        if (/^(https?|mailto|\/|@|\.\.?\/|[a-z]+\.(ts|tsx|js|mjs|css))/.test(tok)) continue;
        if (!seen.has(tok)) seen.set(tok, new Set());
        seen.get(tok).add(file);
      }
    }
  }
}

const missing = [];
for (const [tok, where] of seen) {
  const needle = `.${escapeClass(tok)}`;
  if (!css.includes(needle)) missing.push([tok, [...where]]);
}
missing.sort((a, b) => a[0].localeCompare(b[0]));
for (const [tok, where] of missing) console.log(`${tok}  (${where.slice(0, 2).join(", ")}${where.length > 2 ? ", ..." : ""})`);
console.log(`\n${missing.length} tokens without a CSS rule (${seen.size} checked)`);

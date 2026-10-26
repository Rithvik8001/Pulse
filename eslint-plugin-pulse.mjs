const CLASS_PATTERNS = [
  [/#[0-9a-f]{3,8}\b/i, "raw hex colour. Use a colour token."],
  [
    /\[[^\]]*\d(\.\d+)?px[^\]]*\]/,
    "arbitrary px value. Use a token or a role utility.",
  ],
  [
    /\[\d+(\.\d+)?\]/,
    "arbitrary number. Use a token or a role utility.",
  ],
  [
    /\[[^\]]*#[0-9a-f]{3,8}[^\]]*\]/i,
    "raw hex colour. Use a colour token.",
  ],
  [
    /(^|[\s:!])dark:/,
    "dark: variant. Dark mode is a token swap; style with tokens only.",
  ],
  [
    /(^|[\s:!])text-(xs|sm|base|lg|[2-9]?xl)\b/,
    "raw text size. Use a type-* role.",
  ],
  [
    /(^|[\s:!])font-(mono|serif|heading|bold|extrabold|black)\b/,
    "off-system font. Use Inter 400/500/600 via type-* roles.",
  ],
  [/(^|[\s:!])uppercase\b/, "ALL CAPS. Use sentence case."],
  [/(^|[\s:!])tracking-/, "raw tracking. Tracking comes from type-* roles."],
  [
    /(^|[\s:!])rounded-(sm|md|lg|xl|[23]xl)\b/,
    "raw radius. Use a radius role (rounded-control, rounded-card, ...).",
  ],
  [
    /(^|[\s:!])shadow-(xs|sm|md|lg|xl|2xl)\b/,
    "raw shadow. Depth only on pressables and floaters via shadow-* tokens.",
  ],
  [
    /\b(bg|text|border|fill|stroke|ring|from|to|via|outline|decoration|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
    "Tailwind palette colour. Use a token (brand, ok, bad, warn, t-*).",
  ],
  [
    /(^|[\s:!])animate-(pulse|spin|bounce|ping)\b/,
    "ambient animation. Motion only happens where the user touches.",
  ],
];

const CLASS_CALLEES = new Set(["cn", "cva", "clsx", "twMerge", "tv"]);

function checkString(context, node, value) {
  for (const [pattern, message] of CLASS_PATTERNS) {
    if (pattern.test(value)) {
      context.report({ node, message: `Off-system class: ${message}` });
      return;
    }
  }
}

function walkStrings(context, node, seen) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string")
        checkString(context, node, node.value);
      return;
    case "TemplateLiteral":
      for (const q of node.quasis)
        checkString(context, q, q.value.cooked ?? "");
      for (const e of node.expressions) walkStrings(context, e, seen);
      return;
    case "CallExpression":
      // nested cn()/cva() calls are reported by the CallExpression visitor
      if (
        node.callee.type === "Identifier" &&
        CLASS_CALLEES.has(node.callee.name)
      )
        return;
      for (const a of node.arguments) walkStrings(context, a, seen);
      return;
    case "ConditionalExpression":
      walkStrings(context, node.consequent, seen);
      walkStrings(context, node.alternate, seen);
      return;
    case "LogicalExpression":
      walkStrings(context, node.left, seen);
      walkStrings(context, node.right, seen);
      return;
    case "ArrayExpression":
      for (const el of node.elements) walkStrings(context, el, seen);
      return;
    case "ObjectExpression":
      for (const p of node.properties) {
        if (p.type === "Property") walkStrings(context, p.value, seen);
      }
      return;
    case "JSXExpressionContainer":
      walkStrings(context, node.expression, seen);
      return;
    default:
      return;
  }
}

const noRawStyle = {
  meta: {
    type: "problem",
    docs: { description: "Disallow off-system styling" },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        )
          return;
        if (!node.value) return;
        walkStrings(context, node.value, new Set());
      },
      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          !CLASS_CALLEES.has(node.callee.name)
        )
          return;
        const seen = new Set([node]);
        for (const a of node.arguments) walkStrings(context, a, seen);
      },
    };
  },
};

const COPY_PATTERNS = [
  [/[—→←❤✍♥]/u, "em dash, arrow or decorative glyph. Write it as words."],
  [
    /\p{Extended_Pictographic}/u,
    "emoji. Say it with words or an icon with a label.",
  ],
  [/[A-Za-z]![\s"'`]|[A-Za-z]!$/, "exclamation mark. Keep the tone calm."],
  [/(^|\s)[A-Z]{3,}(\s|$)/, "ALL CAPS word. Use sentence case."],
];

const COPY_PROPS = new Set([
  "title",
  "placeholder",
  "aria-label",
  "label",
  "alt",
  "description",
  "caption",
  "hint",
]);

function checkCopy(context, node, value) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return;
  for (const [pattern, message] of COPY_PATTERNS) {
    if (pattern.test(text)) {
      context.report({ node, message: `Off-system copy: ${message}` });
      return;
    }
  }
}

const noRawCopy = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow off-system copy" },
    schema: [],
  },
  create(context) {
    return {
      JSXText(node) {
        checkCopy(context, node, node.value);
      },
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          !COPY_PROPS.has(node.name.name)
        )
          return;
        if (
          node.value?.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          checkCopy(context, node.value, node.value.value);
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "pulse", version: "1.0.0" },
  rules: { "no-raw-style": noRawStyle, "no-raw-copy": noRawCopy },
};

export default plugin;

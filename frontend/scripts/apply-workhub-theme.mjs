// One-off codemod: moves the hard-coded colours/radii inside <style> blocks onto the WorkHub design tokens
// defined in src/assets/theme.css. Idempotent: values already using var(--…) are untouched.
// usage: node scripts/apply-workhub-theme.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");

const parse = (h) => {
  h = h.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

function mapHex(prop, hex) {
  const [r, g, b] = parse(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const isBg = /^background/.test(prop);
  const isBorder = /^(border|outline)/.test(prop);
  const isText = prop === "color" || /^(fill|stroke|caret-color|text-decoration-color)$/.test(prop);
  if (!isBg && !isBorder && !isText) return null; // shadows etc. stay as they are

  if (sat >= 40) {
    const red = r > g + 40 && r > b + 40 && g < 150;
    const amber = r > 180 && g > 110 && b < 120 && r >= g;
    const green = g > r + 25 && g >= b;
    const blueish = b > r + 15 && b >= g - 10;
    const purple = r > g + 20 && b > g + 20;
    if (red) return lum > 190 ? "var(--danger-soft)" : "var(--danger)";
    if (amber) return lum > 190 ? "var(--warning-soft)" : "var(--warning)";
    if (green) return lum > 190 ? "var(--success-soft)" : "var(--success)";
    if (blueish || purple) {
      if (isBorder) return lum > 200 ? "var(--border-strong)" : "var(--ink)";
      return lum > 190 ? "var(--ink-soft)" : "var(--ink)";
    }
    return null;
  }
  if (isText) {
    if (lum < 100) return "var(--text)";
    if (lum < 190) return "var(--muted)";
    return hex.toLowerCase() === "#ffffff" || hex.toLowerCase() === "#fff" ? null : "var(--muted)";
  }
  if (isBorder) {
    if (lum >= 215) return "var(--border)";
    if (lum >= 150) return "var(--border-strong)";
    return lum < 90 ? "var(--ink)" : "var(--muted)";
  }
  // background
  if (hex.toLowerCase() === "#fff" || hex.toLowerCase() === "#ffffff") return "var(--surface)";
  if (lum >= 246) return "var(--bg)";
  if (lum >= 230) return "var(--sunken)";
  if (lum >= 200) return "var(--border)";
  if (lum < 110) return "var(--ink)";
  return "var(--muted)";
}

const RADIUS = { 2: "var(--radius-sm)", 3: "var(--radius-sm)", 4: "var(--radius-sm)", 6: "var(--radius-sm)", 8: "var(--radius-sm)", 10: "var(--radius-field)", 12: "var(--radius-field)", 14: "var(--radius)", 16: "var(--radius)", 20: "var(--radius)", 24: "var(--radius)" };

function mapDecl(prop, value) {
  if (/^border-radius$/.test(prop)) {
    return value.replace(/\b(\d+)px\b/g, (m, n) => RADIUS[n] ?? m);
  }
  if (/^(background|background-color|background-image|color|fill|stroke|border|border-(top|right|bottom|left)|border-color|border-(top|right|bottom|left)-color|outline|outline-color|caret-color)$/.test(prop)) {
    return value.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (hex) => mapHex(prop, hex) ?? hex);
  }
  return value;
}

const BTN = /(^|[\s.>+~,])(?:[\w-]*)(btn|button)(?![\w-]*(?:icon|close|toggle|tab-|tabs))/i;

function transformCss(css) {
  // rule level: pill buttons
  css = css.replace(/([^{}]+)\{([^{}]*)\}/g, (all, sel, body) => {
    if (/^\s*@/.test(sel) || /keyframes/.test(sel)) return all;
    let out = body.replace(/(^|[;\s])([a-z-]+)(\s*:\s*)([^;{}]+)(;|$)/g, (m, pre, prop, colon, val, end) => {
      const nv = mapDecl(prop.trim(), val);
      return nv === val ? m : `${pre}${prop}${colon}${nv}${end}`;
    });
    const selectors = sel.split(",");
    const isButtonRule = selectors.some((s) => BTN.test(s) && !/:\s*(before|after)/.test(s));
    if (isButtonRule && /border-radius\s*:/.test(out) && /\bpadding\s*:/.test(out)) {
      out = out.replace(/border-radius\s*:\s*[^;]+/, "border-radius: 999px");
    }
    return `${sel}{${out}}`;
  });
  return css;
}

function processVue(src) {
  return src.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, open, css, close) => open + transformCss(css) + close);
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.vue$/.test(f)) out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of walk("src")) {
  const src = readFileSync(file, "utf8");
  const out = processVue(src);
  if (out !== src) {
    changed++;
    if (!DRY) writeFileSync(file, out);
  }
}
console.log(`${DRY ? "would change" : "changed"} ${changed} files`);

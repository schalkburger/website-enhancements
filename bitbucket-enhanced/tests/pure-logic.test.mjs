// Tests the pure, deterministic logic inside bitbucket-enhanced.user.js by
// extracting it from the actual shipped source (not a copy) via regex, so a
// passing test proves the shipped file behaves correctly. Run: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bitbucket-enhanced.user.js");
const source = readFileSync(scriptPath, "utf8");

function extract(name, source) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`));
  if (!match) throw new Error(`could not extract function ${name} from source`);
  return match[0];
}

function extractConst(name, source) {
  const match = source.match(new RegExp(`const ${name} = (.*);`));
  if (!match) throw new Error(`could not extract const ${name} from source`);
  return `const ${name} = ${match[1]};`;
}

const classifyPipelineState = new Function(
  `${extractConst("PIPELINE_RUNNING_BUTTON_TEXT", source)}\n${extractConst("PIPELINE_TERMINAL_BUTTON_TEXT", source)}\n${extract("classifyPipelineState", source)}\nreturn classifyPipelineState;`,
)();

test("classifyPipelineState: Stop button means running", () => {
  assert.equal(classifyPipelineState(["Stop"]), "running");
});

test("classifyPipelineState: Rerun button means finished", () => {
  assert.equal(classifyPipelineState(["Rerun"]), "finished");
});

test("classifyPipelineState: Run again button means finished", () => {
  assert.equal(classifyPipelineState(["Run again"]), "finished");
});

test("classifyPipelineState: Stop wins when both are present (mid-transition DOM)", () => {
  assert.equal(classifyPipelineState(["Stop", "Rerun"]), "running");
});

test("classifyPipelineState: no matching button is unknown", () => {
  assert.equal(classifyPipelineState([]), "unknown");
});

test("classifyPipelineState: unrelated buttons (e.g. step card 'Redeploy') are unknown", () => {
  assert.equal(classifyPipelineState(["Redeploy", "Search", "Download"]), "unknown");
});

test("classifyPipelineState: null/empty labels do not throw", () => {
  assert.equal(classifyPipelineState([null, "", undefined]), "unknown");
});

const canonicalPrUrlSource = extract("canonicalPrUrl", source);
function makeCanonicalPrUrl(pathname, origin) {
  const fn = new Function("location", `${canonicalPrUrlSource}\nreturn canonicalPrUrl();`);
  return fn({ pathname, origin });
}

test("canonicalPrUrl: bare PR path", () => {
  assert.equal(makeCanonicalPrUrl("/ovexio/asgard/pull-requests/1925", "https://bitbucket.org"), "https://bitbucket.org/ovexio/asgard/pull-requests/1925");
});

test("canonicalPrUrl: strips /diff suffix", () => {
  assert.equal(makeCanonicalPrUrl("/ovexio/asgard/pull-requests/1925/diff", "https://bitbucket.org"), "https://bitbucket.org/ovexio/asgard/pull-requests/1925");
});

test("canonicalPrUrl: strips /commits suffix", () => {
  assert.equal(makeCanonicalPrUrl("/ovexio/asgard/pull-requests/1925/commits", "https://bitbucket.org"), "https://bitbucket.org/ovexio/asgard/pull-requests/1925");
});

test("canonicalPrUrl: returns null when not on a PR page", () => {
  assert.equal(makeCanonicalPrUrl("/ovexio/asgard/branch/main", "https://bitbucket.org"), null);
});

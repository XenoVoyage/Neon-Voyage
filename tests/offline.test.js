"use strict";

const childProcess = require("node:child_process");
const {
  assert,
  fs,
  path,
  PROJECT_ROOT,
  readProject,
  listFiles
} = require("./_harness");

function htmlReferences(html) {
  return Array.from(html.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi), (match) => match[1]);
}

function cssReferences(css) {
  return Array.from(css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi), (match) => match[1]);
}

function localFile(reference) {
  const clean = reference.split(/[?#]/, 1)[0];
  assert.ok(clean && !clean.startsWith("/"), `root-relative path breaks repository-subpath hosting: ${reference}`);
  assert.ok(!/^(?:[a-z]+:)?\/\//i.test(clean), `external reference is forbidden: ${reference}`);
  assert.ok(!/^(?:data|blob|javascript|mailto):/i.test(clean), `embedded or active reference is forbidden: ${reference}`);
  const resolved = path.resolve(PROJECT_ROOT, clean);
  assert.ok(resolved.startsWith(PROJECT_ROOT + path.sep), `reference escapes the repository: ${reference}`);
  assert.ok(fs.existsSync(resolved), `referenced file does not exist: ${reference}`);
  assert.ok(fs.statSync(resolved).isFile(), `reference is not a regular file: ${reference}`);
  return resolved;
}

function runtimeSourceFiles() {
  return listFiles(PROJECT_ROOT).filter((file) => {
    if (!/\.(?:html|css|js)$/i.test(file)) return false;
    const relative = path.relative(PROJECT_ROOT, file);
    return !relative.startsWith(`tests${path.sep}`) && !relative.startsWith(`.github${path.sep}`);
  });
}

module.exports = function register(test) {
  const html = readProject("index.html");
  const css = readProject("styles.css");

  test("HTML declares a strict local-only Content Security Policy", () => {
    const cspTag = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
    assert.ok(cspTag, "Content Security Policy meta tag is required");
    const content = cspTag[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
    assert.ok(content, "Content Security Policy content is required");
    const csp = content[2].toLowerCase();
    for (const directive of [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'none'",
      "font-src 'none'",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-src 'none'",
      "worker-src 'none'"
    ]) assert.ok(csp.includes(directive), `CSP missing ${directive}`);
    assert.ok(!csp.includes("unsafe-inline"), "inline script/style execution is forbidden");
    assert.ok(!csp.includes("unsafe-eval"), "dynamic code execution is forbidden");
    assert.ok(!/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html), "inline scripts are forbidden");
    assert.ok(!/<style\b/i.test(html), "inline styles are forbidden");
    assert.ok(!/\sstyle\s*=/i.test(html), "style attributes are forbidden");
  });

  test("all runtime resources are local and repository-subpath relative", () => {
    const references = htmlReferences(html).concat(cssReferences(css));
    assert.ok(references.length >= 6, "expected local scripts, stylesheet, and raster art");
    for (const reference of references) localFile(reference);
    const base = new URL("https://xenovoyage.github.io/Neon-Voyage/");
    for (const reference of htmlReferences(html)) {
      const resolved = new URL(reference, base);
      assert.equal(resolved.origin, base.origin, `${reference} changes origin under GitHub Pages`);
      assert.ok(resolved.pathname.startsWith(base.pathname), `${reference} escapes the GitHub Pages repository subpath`);
    }
    assert.ok(!/<base\b/i.test(html), "base tags make file and repository-subpath behavior fragile");
  });

  test("plain scripts use deterministic dependency order with no module loader", () => {
    const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
    assert.ok(scripts.length >= 5, "expected the local runtime systems");
    assert.equal(scripts[0], "js/config.js");
    assert.equal(scripts[1], "js/core.js");
    assert.equal(scripts.at(-1), "js/game.js");
    assert.equal(new Set(scripts).size, scripts.length, "runtime scripts must not be loaded twice");
    for (const script of scripts) assert.ok(/^js\/[a-z0-9-]+\.js$/i.test(script), `unexpected script path ${script}`);
    const tags = Array.from(html.matchAll(/<script\b([^>]*)>/gi), (match) => match[1]);
    assert.ok(tags.every((tag) => /\bdefer\b/i.test(tag)), "every script must use defer");
    assert.ok(tags.every((tag) => !/\btype=["']module["']/i.test(tag)), "ES modules break direct local compatibility");
  });

  test("runtime contains no network, telemetry, dynamic code, workers, or dependencies", () => {
    const forbidden = [
      [/https?:\/\//i, "remote URL"],
      [/(?:^|[^:])\/\/[a-z0-9.-]+\.[a-z]{2,}/i, "protocol-relative URL"],
      [/\bfetch\s*\(/, "fetch"],
      [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
      [/\bWebSocket\b/, "WebSocket"],
      [/\bEventSource\b/, "EventSource"],
      [/\bsendBeacon\b/, "sendBeacon"],
      [/\bserviceWorker\b/i, "service worker"],
      [/\bnew\s+(?:Shared)?Worker\s*\(/, "worker"],
      [/\beval\s*\(/, "eval"],
      [/\bnew\s+Function\s*\(/, "Function constructor"],
      [/\bimport\s*\(/, "dynamic import"],
      [/^\s*(?:import|export)\s/m, "ES module syntax"],
      [/@import\b/i, "CSS import"],
      [/\brequire\s*\(/, "runtime package loader"],
      [/\b(?:google-analytics|gtag|segment|mixpanel|posthog|sentry)\b/i, "telemetry SDK"]
    ];
    for (const file of runtimeSourceFiles()) {
      const source = fs.readFileSync(file, "utf8");
      for (const [pattern, label] of forbidden) {
        assert.ok(!pattern.test(source), `${path.relative(PROJECT_ROOT, file)} contains forbidden ${label}`);
      }
    }
    for (const forbiddenFile of ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "node_modules"] ) {
      assert.equal(fs.existsSync(path.join(PROJECT_ROOT, forbiddenFile)), false, `${forbiddenFile} is not needed`);
    }
  });

  test("repository has no symlinks and stays within practical offline payload limits", () => {
    const files = listFiles(PROJECT_ROOT).filter((file) => !file.includes(`${path.sep}.git${path.sep}`));
    let runtimeBytes = 0;
    for (const file of files) {
      const stats = fs.lstatSync(file);
      assert.equal(stats.isSymbolicLink(), false, `${path.relative(PROJECT_ROOT, file)} must not be a symlink`);
      assert.ok(stats.size <= 5 * 1024 * 1024, `${path.relative(PROJECT_ROOT, file)} is unexpectedly large`);
      const relative = path.relative(PROJECT_ROOT, file);
      if (!relative.startsWith(`tests${path.sep}`) && !relative.startsWith(`.github${path.sep}`)) runtimeBytes += stats.size;
    }
    assert.ok(runtimeBytes <= 12 * 1024 * 1024, `offline runtime is too large: ${runtimeBytes} bytes`);
  });

  test("every runtime JavaScript file passes syntax checking", () => {
    const scripts = listFiles(path.join(PROJECT_ROOT, "js")).filter((file) => file.endsWith(".js"));
    assert.ok(scripts.length >= 5, "expected at least five runtime scripts");
    for (const script of scripts) childProcess.execFileSync(process.execPath, ["--check", script], { stdio: "pipe" });
  });

  test("release metadata and public documentation agree on version 1.3.0", () => {
    const version = readProject("VERSION.txt").trim();
    assert.equal(version, "Neon Voyage 1.3.0");
    assert.match(readProject("js/config.js"), /version:\s*["']1\.3\.0["']/);
    assert.match(readProject("README.md"), /Version 1\.3\.0/);
    assert.match(readProject("CHANGELOG.md"), /^## \[1\.3\.0\]/m);
    assert.match(readProject("AUDIT.md"), /^# Neon Voyage 1\.3\.0/m);
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, "AGENTS.md")), "project contributor instructions are required");
  });

  test("GitHub Pages publishes the repository root without a production build", () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, ".nojekyll")), ".nojekyll is required");
    const workflow = readProject(".github/workflows/pages.yml");
    assert.match(workflow, /actions\/configure-pages@v\d+/);
    assert.match(workflow, /actions\/upload-pages-artifact@v\d+/);
    assert.match(workflow, /actions\/deploy-pages@v\d+/);
    assert.match(workflow, /path:\s*[.'"]+/);
    assert.ok(!/\b(?:npm|yarn|pnpm|bun)\b/i.test(workflow), "Pages must not install or build dependencies");
  });
};

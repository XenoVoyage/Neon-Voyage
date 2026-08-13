"use strict";

const childProcess = require("node:child_process");
const crypto = require("node:crypto");
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

  test("every local raster asset is referenced by the runtime and every runtime asset exists", () => {
    const runtimeSources = runtimeSourceFiles().map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const declared = new Set(Array.from(runtimeSources.matchAll(/["'](assets\/[a-z0-9-]+\.(?:png|jpe?g|webp))["']/gi), (match) => match[1]));
    assert.ok(declared.size >= 3, "expected authored local raster assets");
    for (const reference of declared) localFile(reference);

    const assetDirectory = path.join(PROJECT_ROOT, "assets");
    const assets = listFiles(assetDirectory).filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file));
    assert.ok(assets.length > 0, "the local asset directory is empty");
    for (const file of assets) {
      const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join("/");
      assert.ok(declared.has(relative), `${relative} is an unused runtime asset`);
    }
  });

  test("README gameplay images are local, lightweight, complete WebP documentation assets", () => {
    const readme = readProject("README.md");
    const references = Array.from(
      readme.matchAll(/!\[[^\]]*\]\((docs\/assets\/[a-z0-9-]+\.webp)\)/gi),
      (match) => match[1]
    );
    assert.equal(references.length, 2, "README should use exactly two restrained gameplay images");
    assert.equal(new Set(references).size, references.length, "README gameplay images must be unique");

    for (const reference of references) {
      const file = localFile(reference);
      assert.ok(fs.statSync(file).size <= 256 * 1024, `${reference} exceeds the documentation image budget`);
      const header = fs.readFileSync(file).subarray(0, 12);
      assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF", `${reference} is not a WebP RIFF file`);
      assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP", `${reference} is not a WebP file`);
    }

    const directory = path.join(PROJECT_ROOT, "docs", "assets");
    const files = listFiles(directory)
      .filter((file) => file.endsWith(".webp"))
      .map((file) => path.relative(PROJECT_ROOT, file).split(path.sep).join("/"))
      .sort();
    assert.deepEqual(files, references.slice().sort(), "every README gameplay image must be referenced exactly once");
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

  test("release metadata and public documentation agree on version 1.5.0", () => {
    const version = readProject("VERSION.txt").trim();
    assert.equal(version, "Neon Voyage 1.5.0");
    assert.match(readProject("js/config.js"), /version:\s*["']1\.5\.0["']/);
    assert.match(readProject("README.md"), /Version 1\.5\.0/);
    assert.match(readProject("CHANGELOG.md"), /^## \[1\.5\.0\]/m);
    assert.match(readProject("AUDIT.md"), /^# Neon Voyage 1\.5\.0/m);
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, "AGENTS.md")), "project contributor instructions are required");
  });

  test("SHA256SUMS exactly covers and verifies every release file", () => {
    const manifest = readProject("SHA256SUMS").trim().split(/\r?\n/);
    const entries = new Map();
    for (const line of manifest) {
      const match = line.match(/^([a-f0-9]{64})  ([^\r\n]+)$/);
      assert.ok(match, `invalid checksum line: ${line}`);
      const relative = match[2];
      assert.ok(!entries.has(relative), `duplicate checksum entry: ${relative}`);
      assert.ok(relative !== "SHA256SUMS" && !path.isAbsolute(relative), `invalid checksum path: ${relative}`);
      const absolute = path.resolve(PROJECT_ROOT, relative);
      assert.ok(absolute.startsWith(PROJECT_ROOT + path.sep), `checksum path escapes repository: ${relative}`);
      assert.ok(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `checksum target is missing: ${relative}`);
      const actual = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
      assert.equal(actual, match[1], `checksum mismatch: ${relative}`);
      entries.set(relative, match[1]);
    }

    const roots = [".github/workflows", "assets", "docs/assets", "js", "tests"];
    const expected = [];
    for (const entry of fs.readdirSync(PROJECT_ROOT, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name === "SHA256SUMS" || /\.(?:log|zip)$/i.test(entry.name)) continue;
      expected.push(entry.name);
    }
    for (const root of roots) {
      const directory = path.join(PROJECT_ROOT, root);
      for (const file of listFiles(directory)) {
        expected.push(path.relative(PROJECT_ROOT, file).split(path.sep).join("/"));
      }
    }
    expected.sort();
    assert.deepEqual(Array.from(entries.keys()).sort(), expected, "checksum manifest must exactly cover release files");
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

  test("repository governance keeps protected main behind the required offline audit", () => {
    const ci = readProject(".github/workflows/ci.yml");
    const pages = readProject(".github/workflows/pages.yml");
    const agents = readProject("AGENTS.md");
    assert.match(ci, /^name:\s*Offline audit\s*$/m);
    assert.match(ci, /^\s*pull_request:\s*$/m, "the audit must run for pull requests");
    assert.match(ci, /^\s*push:\s*\n\s*branches:\s*\[main\]\s*$/m, "the audit must run after main merges");
    assert.match(ci, /^\s{2}audit:\s*$/m, "the required check context must remain Offline audit / audit");
    assert.match(ci, /^permissions:\s*\n\s*contents:\s*read\s*$/m, "the audit must keep read-only contents permission");
    assert.doesNotMatch(ci, /continue-on-error\s*:\s*true/i, "the required audit cannot be advisory");
    assert.doesNotMatch(ci, /\b(?:contents|actions|checks|pull-requests):\s*write\b/i, "the audit has unnecessary write permission");
    assert.doesNotMatch(pages, /^\s*pull_request:\s*$/m, "Pages must deploy only after merge to main");
    assert.match(pages, /^\s*push:\s*\n\s*branches:\s*\[main\]\s*$/m);

    assert.match(agents, /Read this file at the start of every task/);
    assert.match(agents, /update it only when an enduring project invariant/);
    assert.match(agents, /Treat `main` as protected/);
    assert.match(agents, /Never push directly to it, force-push it, delete it, or bypass branch protection/);
    assert.match(agents, /required `Offline audit \/ audit` check passes/);
    assert.match(agents, /merge through a pull request/);
    assert.match(agents, /never self-approve or fabricate review/);
  });
};

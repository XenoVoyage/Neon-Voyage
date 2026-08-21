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

const RELEASE_IGNORED_DIRECTORIES = new Set([
  ".git", ".idea", ".vscode", ".test-output", ".pw-tmp", "coverage", "dist", "node_modules"
]);
const RUNTIME_IGNORED_DIRECTORIES = new Set([...RELEASE_IGNORED_DIRECTORIES, ".github", "tests"]);
const VERIFICATION_NODE_VERSION = "22.22.0";
const WORKFLOW_ACTION_PINS = Object.freeze({
  "actions/checkout": { major: "v7", sha: "3d3c42e5aac5ba805825da76410c181273ba90b1" },
  "actions/setup-node": { major: "v7", sha: "820762786026740c76f36085b0efc47a31fe5020" },
  "actions/configure-pages": { major: "v6", sha: "45bfe0192ca1faeb007ade9deae92b16b8254a0d" },
  "actions/upload-pages-artifact": { major: "v5", sha: "fc324d3547104276b827a68afc52ff2a11cc49c9" },
  "actions/deploy-pages": { major: "v5", sha: "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128" }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertPinnedAction(workflow, action) {
  const pin = WORKFLOW_ACTION_PINS[action];
  assert.ok(pin, `missing expected pin for ${action}`);
  assert.match(workflow, new RegExp(`uses:\\s*${escapeRegExp(action)}@${pin.sha}\\s+#\\s*${pin.major}\\b`),
    `${action} must use its reviewed immutable ${pin.major} commit`);
}

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
  return listFiles(PROJECT_ROOT, RUNTIME_IGNORED_DIRECTORIES)
    .filter((file) => /\.(?:html|css|js)$/i.test(file));
}

function releaseFiles() {
  return listFiles(PROJECT_ROOT, RELEASE_IGNORED_DIRECTORIES).filter((file) => {
    const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join("/");
    if (relative === "SHA256SUMS" || relative === ".DS_Store" || relative === "Thumbs.db") return false;
    return !/(?:\.log|\.zip|\.swp|\.swo|~)$/i.test(relative);
  });
}

function markdownReferences(source) {
  return Array.from(source.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g), (match) => ({
    image: match[1] === "!",
    label: match[2].trim(),
    target: match[3].replace(/^<|>$/g, "")
  }));
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
      "img-src 'self'",
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
    assert.ok(!/\bimg-src\b[^;]*\bdata:/i.test(csp), "unused data-image permission weakens the CSP");
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
    const imageMatches = Array.from(readme.matchAll(/!\[([^\]]*)\]\((docs\/assets\/[a-z0-9-]+\.webp)\)/gi));
    const references = imageMatches.map((match) => match[2]);
    assert.equal(references.length, 2, "README should use exactly two restrained gameplay images");
    assert.equal(new Set(references).size, references.length, "README gameplay images must be unique");

    for (const match of imageMatches) {
      assert.ok(match[1].trim().length >= 12, `${match[2]} needs meaningful alternative text`);
    }

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

  test("README stays concise, player-facing, and connected to the project guides", () => {
    const readme = readProject("README.md");
    const pagesUrl = "https://xenovoyage.github.io/Neon-Voyage/";
    const launchHeading = readme.match(/^##\s+\[([^\]]+)\]\((https:\/\/xenovoyage\.github\.io\/Neon-Voyage\/)\)$/m);
    const linkedHero = readme.match(/\[!\[([^\]]+)\]\((docs\/assets\/neon-voyage-earth-orbit\.webp)\)\]\((https:\/\/xenovoyage\.github\.io\/Neon-Voyage\/)\)/);
    assert.ok(readme.split(/\r?\n/).length <= 65, "README has grown beyond its public landing-page role");
    assert.ok(launchHeading, "README needs a prominent linked browser-play heading");
    assert.equal(launchHeading[2], pagesUrl);
    assert.match(launchHeading[1], /\b(?:play|launch)\b/i, "browser-play link should use action-oriented text");
    assert.ok(linkedHero, "the Earth-orbit hero image must link directly to the live game");
    assert.equal(linkedHero[2], "docs/assets/neon-voyage-earth-orbit.webp");
    assert.equal(linkedHero[3], pagesUrl);
    assert.match(linkedHero[1], /\b(?:play|launch|start)\b/i, "linked hero image needs action-oriented alternative text");
    assert.match(readme, /\bindex\.html\b/, "README needs a direct local-play instruction");
    assert.match(readme, /\bkeyboard\b/i);
    assert.match(readme, /\bgamepad\b/i);
    assert.match(readme, /\btouch\b/i);
    assert.match(readme, /docs\/GAME_DESIGN\.md/);
    assert.match(readme, /docs\/ARCHITECTURE\.md/);
    assert.match(readme, /docs\/STATUS\.md/);
    assert.match(readme, /CONTRIBUTING\.md/);
    assert.match(readme, /\[MIT License\]\(LICENSE\)/);
    assert.doesNotMatch(readme, /shields\.io/i, "README should not depend on an unnecessary badge service");
    assert.doesNotMatch(readme, /\b\d+\/\d+ tests passed\b|\bNode v\d+|Content Security Policy|fixed[- ]step|Pointer Events/i,
      "README contains implementation or audit detail that belongs in technical documentation");
  });

  test("local Markdown links resolve and image descriptions are meaningful", () => {
    const markdownFiles = releaseFiles().filter((file) => file.endsWith(".md"));
    assert.ok(markdownFiles.length >= 8, "expected the public, design, security, audit, and test guides");
    for (const file of markdownFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const reference of markdownReferences(source)) {
        if (reference.image) assert.ok(reference.label.length >= 8, `${path.relative(PROJECT_ROOT, file)} has an empty or vague image description`);
        if (/^(?:[a-z]+:)?\/\//i.test(reference.target) || reference.target.startsWith("#") || reference.target.startsWith("mailto:")) continue;
        const clean = reference.target.split(/[?#]/, 1)[0];
        const resolved = path.resolve(path.dirname(file), clean);
        assert.ok(resolved.startsWith(PROJECT_ROOT + path.sep), `${reference.target} escapes the repository`);
        assert.ok(fs.existsSync(resolved), `${path.relative(PROJECT_ROOT, file)} links to missing ${reference.target}`);
      }
    }
  });

  test("plain scripts use deterministic dependency order with no module loader", () => {
    const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
    assert.ok(scripts.length >= 5, "expected the local runtime systems");
    assert.equal(scripts[0], "js/config.js");
    assert.equal(scripts[1], "js/core.js");
    assert.equal(scripts.at(-1), "js/game.js");
    assert.equal(new Set(scripts).size, scripts.length, "runtime scripts must not be loaded twice");
    for (const script of scripts) assert.ok(/^js\/[a-z0-9-]+\.js$/i.test(script), `unexpected script path ${script}`);
    const runtimeScripts = listFiles(path.join(PROJECT_ROOT, "js"))
      .filter((file) => file.endsWith(".js"))
      .map((file) => path.relative(PROJECT_ROOT, file).split(path.sep).join("/"))
      .sort();
    assert.deepEqual(scripts.slice().sort(), runtimeScripts, "every runtime script must be loaded exactly once");
    const tags = Array.from(html.matchAll(/<script\b([^>]*)>/gi), (match) => match[1]);
    assert.ok(tags.every((tag) => /\bdefer\b/i.test(tag)), "every script must use defer");
    assert.ok(tags.every((tag) => !/\btype=["']module["']/i.test(tag)), "ES modules break direct local compatibility");
  });

  test("every test suite is registered exactly once", () => {
    const runner = readProject("tests/run.js");
    const registered = Array.from(runner.matchAll(/require\(["'](\.\/[a-z0-9-]+\.test)["']\)/gi), (match) => match[1]).sort();
    const suites = listFiles(path.join(PROJECT_ROOT, "tests"))
      .filter((file) => file.endsWith(".test.js"))
      .map((file) => `./${path.basename(file, ".js")}`)
      .sort();
    assert.deepEqual(registered, suites, "every test suite must be registered exactly once");
  });

  test("release text files are free of merge markers and whitespace damage", () => {
    const textFiles = releaseFiles().filter((file) => {
      const relative = path.relative(PROJECT_ROOT, file);
      return /\.(?:css|html|js|json|md|txt|ya?ml)$/i.test(relative) || ["LICENSE", ".gitignore", ".nojekyll"].includes(relative);
    });
    for (const file of textFiles) {
      const relative = path.relative(PROJECT_ROOT, file);
      const source = fs.readFileSync(file, "utf8");
      assert.ok(source.endsWith("\n"), `${relative} is missing its final newline`);
      assert.doesNotMatch(source, /[ \t]+$/m, `${relative} contains trailing whitespace`);
      assert.doesNotMatch(source, /^(?:<<<<<<<|=======|>>>>>>>)(?: |$)/m, `${relative} contains a merge marker`);
    }
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
    const files = listFiles(PROJECT_ROOT, RELEASE_IGNORED_DIRECTORIES);
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

  test("runtime metadata and public documentation agree on version v2026.8.21b", () => {
    const version = readProject("VERSION.txt").trim();
    assert.equal(version, "Neon Voyage v2026.8.21b");
    assert.match(readProject("js/config.js"), /version:\s*["']v2026\.8\.21b["']/);
    assert.match(readProject("index.html"), />Version v2026\.8\.21b</);
    assert.match(readProject("README.md"), /Version v2026\.8\.21b/);
    assert.match(readProject("CHANGELOG.md"), /^## \[v2026\.8\.21b\] — 2026-08-21$/m);
    assert.match(readProject("AUDIT.md"), /^# Neon Voyage v2026\.8\.21b/m);
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

    const expected = releaseFiles()
      .map((file) => path.relative(PROJECT_ROOT, file).split(path.sep).join("/"))
      .sort();
    assert.deepEqual(Array.from(entries.keys()).sort(), expected, "checksum manifest must exactly cover release files");
  });

  test("GitHub Pages publishes the repository root without a production build", () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, ".nojekyll")), ".nojekyll is required");
    const workflow = readProject(".github/workflows/pages.yml");
    for (const action of [
      "actions/checkout",
      "actions/setup-node",
      "actions/configure-pages",
      "actions/upload-pages-artifact",
      "actions/deploy-pages"
    ]) assertPinnedAction(workflow, action);
    assert.doesNotMatch(workflow, /uses:\s*[^\s@]+@v\d+\b/, "workflow actions must not use mutable major tags");
    assert.match(workflow,
      new RegExp(`uses:\\s*actions/upload-pages-artifact@${WORKFLOW_ACTION_PINS["actions/upload-pages-artifact"].sha}[^\\n]*\\n\\s*with:\\s*\\n\\s*path:\\s*\\.\\s*\\n\\s*include-hidden-files:\\s*true`, "m"),
      "the Pages artifact must preserve repository-root files such as .nojekyll");
    assert.match(workflow, /^\s{4}if:\s*github\.ref\s*==\s*['"]refs\/heads\/main['"]\s*$/m,
      "manual Pages dispatch must not deploy an unmerged branch");
    assert.match(workflow,
      new RegExp(`uses:\\s*actions/checkout@${WORKFLOW_ACTION_PINS["actions/checkout"].sha}[^\\n]*\\n\\s*with:\\s*\\n\\s*persist-credentials:\\s*false`, "m"));
    assert.match(workflow, new RegExp(`node-version:\\s*${escapeRegExp(VERIFICATION_NODE_VERSION)}\\s*$`, "m"));
    assert.ok(!/\b(?:npm|yarn|pnpm|bun)\b/i.test(workflow), "Pages must not install or build dependencies");
  });

  test("repository governance keeps protected main behind the required offline audit", () => {
    const ci = readProject(".github/workflows/ci.yml");
    const pages = readProject(".github/workflows/pages.yml");
    const agents = readProject("AGENTS.md");
    const contributing = readProject("CONTRIBUTING.md");
    const pullRequestTemplate = readProject(".github/pull_request_template.md");
    assert.match(ci, /^name:\s*Offline audit\s*$/m);
    assert.match(ci, /^\s*pull_request:\s*$/m, "the audit must run for pull requests");
    assert.match(ci, /^\s*push:\s*\n\s*branches:\s*\[main\]\s*$/m, "the audit must run after main merges");
    assert.match(ci, /^\s{2}audit:\s*$/m, "the required check context must remain Offline audit / audit");
    assert.match(ci, /^permissions:\s*\n\s*contents:\s*read\s*$/m, "the audit must keep read-only contents permission");
    assert.doesNotMatch(ci, /continue-on-error\s*:\s*true/i, "the required audit cannot be advisory");
    assert.doesNotMatch(ci, /\b(?:contents|actions|checks|pull-requests):\s*write\b/i, "the audit has unnecessary write permission");
    assertPinnedAction(ci, "actions/checkout");
    assertPinnedAction(ci, "actions/setup-node");
    assert.doesNotMatch(ci, /uses:\s*[^\s@]+@v\d+\b/, "workflow actions must not use mutable major tags");
    assert.match(ci,
      new RegExp(`uses:\\s*actions/checkout@${WORKFLOW_ACTION_PINS["actions/checkout"].sha}[^\\n]*\\n\\s*with:\\s*\\n\\s*persist-credentials:\\s*false`, "m"));
    assert.match(ci, new RegExp(`node-version:\\s*${escapeRegExp(VERIFICATION_NODE_VERSION)}\\s*$`, "m"));
    assert.doesNotMatch(pages, /^\s*pull_request:\s*$/m, "Pages must deploy only after merge to main");
    assert.match(pages, /^\s*push:\s*\n\s*branches:\s*\[main\]\s*$/m);

    assert.match(agents, /^\*\*Project Engineering Standard:\*\* v1\.0$/m);
    const standardStatus = agents.match(/^\*\*Standard Status:\*\* (adopting|verified)$/m);
    assert.ok(standardStatus, "AGENTS.md needs one valid engineering-standard status");
    if (standardStatus[1] === "adopting") {
      assert.match(readProject("AUDIT.md"), /Standard status remains `adopting`/,
        "an adopting standard needs an explicit current audit disposition");
    }
    assert.match(agents, /\bDone means\b/);
    assert.match(agents, /`node tests\/run\.js`/);
    assert.match(agents, /`sha256sum --check SHA256SUMS`/);

    const agentHeadings = Array.from(agents.matchAll(/^##\s+(.+)$/gm), (match) => match[1].toLowerCase());
    for (const topic of ["priorities", "boundaries", "ownership", "verification", "documentation", "git"]) {
      assert.ok(agentHeadings.some((heading) => heading.includes(topic)), `AGENTS.md needs a ${topic} section`);
    }
    const gitSectionStart = agents.search(/^##\s+[^\n]*\bgit\b/im);
    assert.ok(gitSectionStart >= 0, "AGENTS.md needs a Git workflow owner");
    const gitSection = agents.slice(gitSectionStart);
    assert.match(gitSection, /\bmain\b[^\n]*\bprotected\b/i);
    assert.match(gitSection, /\bmain\b[^\n]*(?:never|do not)[^\n]*push directly/i);
    assert.match(gitSection, /`Offline audit \/ audit`/);
    assert.match(gitSection, /draft[^\n]*pull request/i);
    assert.match(gitSection, /\bmerge\b[^\n]*user[^\n]*explicit/i);
    assert.match(gitSection, /independent[^\n]*approval/i);
    assert.match(gitSection, /(?:never|do not)[^\n]*self-approve/i);
    assert.match(gitSection, /(?:tags|published releases)[^\n]*immutable/i);

    const branchDeletionStart = gitSection.search(/branch[^\n]{0,80}delet/i);
    const releaseTermsStart = gitSection.search(/^Use these terms/m);
    assert.ok(branchDeletionStart >= 0 && releaseTermsStart > branchDeletionStart,
      "AGENTS.md needs bounded stale-branch deletion rules");
    const branchDeletionRules = gitSection.slice(branchDeletionStart, releaseTermsStart);
    for (const concept of [
      /\bdefault\b/i,
      /\bprotected\b/i,
      /\brelease branch\b/i,
      /\bopen pull request\b/i,
      /\breachable\b/i,
      /\brecorded head\b/i,
      /\bcommits?\b[^\n]*\bmerge\b/i,
      /\bworktree\b/i,
      /\bcollaborator\b/i,
      /\breport\b[^\n]*\bdeleted branch/i
    ]) assert.match(branchDeletionRules, concept);
    assert.match(agents, /\bSHA256SUMS\b/);
    for (const guide of ["docs/GAME_DESIGN.md", "docs/ARCHITECTURE.md", "docs/STATUS.md", "SECURITY.md"]) {
      assert.ok(agents.includes(guide), `AGENTS.md must route contributors to ${guide}`);
    }
    assert.match(contributing, /Read \[`AGENTS\.md`\]/);
    assert.match(contributing, /node tests\/run\.js/);
    for (const heading of ["Summary", "Context", "Changes", "Deletions and consolidation", "Validation", "Risk and rollback", "Checklist"]) {
      assert.match(pullRequestTemplate, new RegExp(`^## ${heading}$`, "m"), `pull request template is missing ${heading}`);
    }
  });
};

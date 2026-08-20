# Neon Voyage contributor instructions

Read this file at the start of every task, in full, before inspecting or changing the project. Re-read it after changing branches or updating this file. These rules are the canonical handoff for human and AI contributors without access to earlier conversations.

## 1. Priorities

Apply these priorities in order:

1. Preserve user intent, saved progress, accessibility, and working behavior.
2. Choose the smallest complete solution with a clear owner.
3. Keep the runtime deterministic, bounded, local, and secure.
4. Remove proven clutter and duplication.
5. Verify honestly before publishing.

Inspect `git status`, the connected code path, its tests, and the relevant documentation before editing. Preserve unrelated work. Never infer current behavior from filenames, screenshots, or old release notes alone.

## 2. Cold start

For a new task, read in this order:

1. This file in full.
2. `docs/STATUS.md` for current maturity, evidence, and active decision boundaries.
3. `docs/GAME_DESIGN.md` for player intent and `docs/ARCHITECTURE.md` for runtime ownership.
4. `tests/README.md` for the verification and manual-acceptance map.
5. The connected source, tests, issue or decision, and any additional document that owns the requested behavior.

Use `CONTRIBUTING.md` as the short public entrypoint, not as a substitute for these rules. If no active goal or acceptance criteria are documented, ask the user before selecting product direction.

## 3. Non-negotiable boundaries

- Neon Voyage must work by opening `index.html` directly and from its GitHub Pages repository subpath.
- Runtime code is plain HTML, CSS, Canvas, and deferred classic JavaScript.
- Runtime dependencies, package managers, build steps, modules, accounts, analytics, telemetry, dynamic code, and network requests are forbidden.
- Keep the restrictive Content Security Policy and repository-local relative resources.
- Use a fixed time step with bounded catch-up. Every collection and repeating effect needs a real enforced cap and deterministic cleanup.
- Preserve keyboard, mouse, touch, and gamepad access; dialog focus, live status, reduced effects, and pause behavior are product requirements.
- Size the Canvas simulation and DPR-scaled backing store from the live `#game-shell` layout box. Browser viewport metrics may differ from that box when mobile browser chrome changes; do not make `window.innerHeight` a second layout owner or write inline Canvas CSS dimensions from renderer state.
- Keep every encounter in one finite viewport-scaled rectangular field. Camera follow must remain clamped inside that field, and off-screen objective cues must stay bounded, clustered, deterministic, and presentation-only.

## 4. Code quality

- Prefer simple, direct code over frameworks, managers, service layers, event buses, loaders, or speculative extension points.
- Give each function and file one understandable responsibility. Split a file only when the new boundary has a small explicit interface and improves ownership; size alone is not a reason.
- Use descriptive nouns for state and verb phrases for actions. Avoid vague names such as `data`, `manager`, `helper`, or unexplained abbreviations when a domain name is clearer.
- Keep one source of truth for decisions. Do not create extra copies of balance values, design rules, version mirrors, or release evidence beyond the documented required owners.
- Comments explain intent, units, invariants, or browser quirks. Do not narrate obvious syntax, preserve stale explanations, or compensate for unclear names with comments.
- Follow the existing plain-object state and classic-script namespace unless a task proves that boundary insufficient.
- Keep fixed-step and render paths allocation-conscious. Reuse state, expire transient objects, and never add unbounded generation or collections.
- Remove code, fields, selectors, assets, tests, and documentation only after proving they are unused. Do not retain compatibility wrappers or placeholders for hypothetical future work.
- Preserve the legacy progress validator and storage keys unless a tested migration is included; they protect existing player saves.

## 5. Ownership map

| Area | Source of truth |
| --- | --- |
| Balance, stages, waves, difficulty, caps | `js/config.js` |
| Deterministic math, collision, storage, collection utilities | `js/core.js` |
| Simulation, progression, input, orchestration | `js/game.js` |
| Canvas scenes and presentation | `js/render.js` |
| Capped synthesized audio | `js/audio.js` |
| Layout and responsive presentation | `styles.css` |
| Intended player experience | `docs/GAME_DESIGN.md` |

Put new logic in the file that already owns its responsibility. Generalize only after current behavior demonstrates reuse.

## 6. Gameplay invariants

- The seven-stage journey is finite and config-driven, with authored boss encounters at Stages 5 and 7. Do not hardcode stage-specific behavior that the stage and wave data can express.
- A stage clears only after its authored spawns, pending/requeued threats, required objectives, descendants, optional hazards, carrier children, and boss escorts are gone.
- A completed stage first enters a finite, input-locked clear presentation that may advance only bounded final effects. It then enters the existing finite hyperspace sequence, cleans old combat state, and preserves the ship's screen anchor and travel direction.
- Asteroids are ballistic hazards. Asteroid pairs bounce without damaging one another; genuine asteroid-to-alien impacts remain reward-free.
- Split trees and hard-cull requeues preserve objective ownership and finite state. They must never duplicate, drop, or silently resolve a threat.
- Campaign checkpoints store bounded weapon loadouts for earned stages, not live battlefield state. Continue starts a fresh Sector 1 field; New Game confirms before replacing campaign progress.
- Touch sticks are independent, radial, dynamically placed with bounded floating follow, and pointer-ID owned. A stationary right-stick hold may acquire the nearest actionable threat only after its configured delay; any manual deflection latches manual aim for that entire gesture, and live command-ship nodes keep their damage-reduced body out of touch auto-aim eligibility. Every terminal, capture-loss, visibility, pause, orientation, or page-lifecycle path must return input to neutral and clear auto-aim ownership without timing out a deliberate stationary hold.
- The aiming reticle belongs to active mouse or pen pointer aim. Touch input must not expose a cursor target, and a later pointer move on a hybrid device may restore it.
- Lethal damage makes the run terminal immediately. Combat, input, rewards, and random progression stay frozen while only bounded death effects finish; the game-over dialog and focus appear after that finite presentation.
- Automatic spawns account for full radii, field containment, nearby threats, and safe contact time. Unsafe spawns remain pending instead of being forced or discarded.

See `docs/GAME_DESIGN.md` for product intent and `tests/README.md` for the stable verification map. Exact tuning belongs only in `js/config.js`.

## 7. Verification and cleanup

- Add a deterministic regression for every bug fix. Fixed seed plus fixed input must reproduce equivalent state.
- Run focused tests while iterating, then run the complete `node tests/run.js` suite on the frozen candidate.
- Release coverage must include the rendered browser smoke, a weapon-driven Stage 1–7 journey through both bosses, the long deterministic stress run, entity caps, storage failure, responsive layouts, and input cleanup.
- Before deleting or moving repository content, inventory tracked files and search all code, test, HTML, CSS, and Markdown references.
- Verify every runtime script and test suite is registered once, every local link resolves, every asset is referenced, and the checksum manifest covers the complete frozen source tree.
- Review `git diff --check`, JavaScript syntax, the full diff, and any generated evidence before publication.
- Automated browser and viewport checks are not physical-device acceptance. Record only what was actually observed.
- A public release requires an actual playable browser smoke. Use an allowed candidate preview when available; otherwise play the deployed Pages build immediately after merge.

Use the browser matrix in `tests/README.md`. Report automated, rendered, preview/deployed, desktop-manual, and physical-touch evidence separately; an empty evidence category is not a failure, but it must not be presented as completed.

Never weaken or remove a test to hide a defect.

## 8. Documentation ownership

| File | Purpose |
| --- | --- |
| `README.md` | Short public introduction, visuals, controls, and local-play instructions |
| `CONTRIBUTING.md` | Concise contributor entrypoint and workflow routing |
| `docs/STATUS.md` | Current maturity, active boundary, known blockers, and evidence handoff |
| `docs/ARCHITECTURE.md` | Runtime flow, source ownership, persistence, and large-file routing |
| `docs/GAME_DESIGN.md` | Current vision, loop, mechanics, journey, and presentation direction |
| `docs/ASSETS.md` | Asset inventory, provenance, visual rules, and optimization limits |
| `AGENTS.md` | Enduring technical and workflow rules |
| `SECURITY.md` | Supported scope and responsible reporting |
| `CHANGELOG.md` | User-visible product/runtime history |
| `AUDIT.md` | Observed evidence for the current source checkpoint |
| `tests/README.md` | Stable test-suite map and evidence boundaries |

Update every affected canonical document in the same coherent change when implemented behavior, project status, owner decisions, interfaces, commands, verification gates, or workflows change. Update `AGENTS.md` only for enduring contributor contracts, `README.md` only for public-facing truth, and `docs/STATUS.md` only for current state; do not alter unaffected owners or use them as task logs.

## 9. Git, collaboration, and releases

Before editing, inspect the current default-branch head, working tree, open issues, open and draft pull requests, and recent merged work relevant to the task. Do not duplicate active work.

Treat `main` as protected: never push directly to it, force-push it, delete it, or bypass branch protection. Work from the current default branch on a short-lived `agent/<description>` branch unless the user explicitly approves another strategy. Agents may create or switch branches, edit, commit, push the task branch, and open or update a draft pull request when the authorized task requires it.

Stage only task-related files and keep commits coherent. Before requesting review or merge, compare the complete branch with the current base, inspect the full diff, incorporate relevant issue and review context, and run every required check on the frozen candidate. Describe the reason, user impact, risk, rollback path, and observed validation in the pull request.

Open pull requests as drafts by default. Merge through a pull request only after the required `Offline audit / audit` check passes. If approval protection is enabled, wait for a genuine independent approval; never self-approve or fabricate review. Do not merge without the user's explicit request unless a repository-specific rule explicitly grants that authority.

Do not rewrite shared history, move or delete tags or published releases, or discard another contributor's work unless the user explicitly authorizes the exact action. Keep tags and published releases immutable. If authentication, permissions, branch state, or ownership is uncertain, stop and ask instead of guessing.

A stale local or remote branch may be deleted without additional confirmation only after proving all of the following:

- It is not the default, protected, or a release branch, and it has no open pull request.
- Its tip is reachable from the default branch, or its associated pull request is merged and the tip still matches that pull request's recorded head.
- No commits were added after the merge, and no active worktree or collaborator uses the branch.

Report every deleted branch.

Use these terms precisely:

- The **runtime version** is the player-visible build label. `js/config.js` is canonical; the visible UI, `VERSION.txt`, README badge, changelog, audit, and permanent assertions are required mirrors.
- A **deployment** is a GitHub Pages publication of a `main` commit. It may contain documentation-only changes and does not by itself create a release.
- A **release** is an intentionally published runtime snapshot with a matching immutable Git tag. A GitHub Release may attach notes and artifacts to that tag; neither a changelog heading nor a version badge proves that it exists.

Documentation-only maintenance does not change the runtime version or add a release changelog entry unless it changes player-facing behavior. It still goes through a pull request, runs the complete audit because Pages publishes the repository root, and regenerates `SHA256SUMS` after the final file set is frozen. Correct inaccurate audit wording, but never rewrite historical observed evidence to imply a check was rerun when it was not.

Release labels use the actual publication date:

- First release that day: `vYYYY.M.D`, without leading zeroes.
- Later releases that day: append `a`, `b`, `c`, and so on.
- Inspect history before choosing a label; never reuse or skip a label.

For every coherent public release:

1. Change the canonical version in `js/config.js`, then synchronize the visible UI, `VERSION.txt`, README, changelog, audit, and permanent assertions.
2. Add a concise user-facing changelog entry.
3. Review all documentation owners and update only those affected.
4. Freeze the candidate, run the complete verification gate, and record observed evidence in `AUDIT.md`.
5. Regenerate and verify `SHA256SUMS` after every release file is final.
6. Publish one coherent pull request from a short-lived branch.
7. Wait for required checks and any real approval, then normally squash-merge without bypass.
8. Verify post-merge CI, Pages deployment, the live version, and one final Play action.

Do not claim a test, check, deployment, or live verification before observing it. If access blocks publication, leave the branch and pull request in a tested, recoverable state and report the exact blocker.

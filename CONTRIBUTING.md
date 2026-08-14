# Contributing to Neon Voyage

Neon Voyage accepts focused fixes and improvements that preserve its offline, dependency-free browser runtime.

## Before making changes

1. Read [`AGENTS.md`](AGENTS.md) in full. It is the canonical engineering and GitHub workflow contract.
2. Read [`docs/STATUS.md`](docs/STATUS.md) for the current state and active decision boundaries.
3. Use [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) for product intent and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for code ownership.
4. Read [`tests/README.md`](tests/README.md) before choosing verification.
5. Inspect the relevant source, tests, open issues, pull requests, and recent merged work before editing.

If the requested outcome or acceptance criteria are unclear, ask before inventing product direction.

## Workflow

- Start from the current `main` branch on a short-lived `agent/<description>` branch.
- Keep the change narrow, preserve unrelated work, and add deterministic regression coverage for behavior changes.
- Run focused checks while iterating and `node tests/run.js` on the final candidate.
- Complete the applicable browser checks in [`tests/README.md`](tests/README.md). Label simulated, rendered, deployed, and manually observed evidence separately.
- Regenerate `SHA256SUMS` only after the candidate is final, then verify it and inspect the complete diff.
- Open a draft pull request using the repository template. Do not merge without explicit authority.

The browser game has no installation or build step. Node.js 22 or newer is needed only for the dependency-free verification harness.

# Instructions for AI agents

Project-specific rules for this repository (read by Claude Code via `CLAUDE.md`, GitHub Copilot, Codex and other tools following the AGENTS.md convention).

## Changelog and release notes

- **Do not write a changelog.** There is no `CHANGELOG.md` and none should be created or updated.
- Release notes are generated from the commit messages since the previous tag (`scripts/release-notes.mjs`, run by the `Release` workflow on a `v*` tag). The commit messages are the changelog.
- Therefore write commit subjects that make sense to a reader of the release notes. Conventional Commits (`feat: …`, `fix: …`, `!` for breaking changes) are grouped by type; plain messages are listed under "Changes".

## Other project facts

- Releasing is documented in the "Releasing" section of `README.md`.
- Tests: `npm install && npm test`.

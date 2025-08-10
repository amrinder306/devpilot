# Changelog

## [1.0.0-rc.1] - 2025-08-10
### Added
- **Auto-Patch**: prompt → model → JSON files → plan → apply (strict/conflict-aware).
- **Model multiplexer**: OpenAI (Pro), WebLLM (Dev/offline), HTTP-compatible local server.
- **First-run checklist** with telemetry opt-in (local-only counters).
- **Targeted tests** runner (JS/TS, Python, .NET heuristics).
- **Session export/import** for reproducible runs.
- **Auth & Settings**: Pro Mode (OpenAI key), HTTP endpoint, repo slug override, default base.
- **Logs panel** (engine + git).
- **Status bar**: current branch + remote/slug.
- **Revert workflows**: revert commit, revert PR (merge SHA), close PR, delete branch.

### Changed
- Patch Studio: strict apply with per-file force, plan/plan3 endpoints, three-way merge visualizer.

### Fixed
- Better error toasts, confirm dialogs for destructive actions, dynamic port spawn race conditions.

### Notes
- Engine binds to `127.0.0.1` only.
- macOS/Windows signing placeholders included in `electron-builder.yml`.

---

## [0.9.0] - 2025-08-08
- Targeted test runner, Auto-PR from Build tab, OpenAI adapter, session export/import.

## [0.8.0] - 2025-08-06
- Three-way merge visualizer, per-file force toggles, pre-commit hooks, WebLLM wiring (Dev Mode).

## [0.7.0] - 2025-08-04
- Apply plan preview, merge hints, Pro-Mode Auth panel.

## [0.6.1] - 2025-08-02
- Confirm dialogs, branch search/filter, status bar.

## [0.6.0] - 2025-08-01
- Branch picker, PR list, Repo settings, Logs panel.

## [0.5.1] - 2025-07-31
- Close PR + Delete Branch (UI actions).

## [0.5.0] - 2025-07-30
- Revert commit, Revert PR, delete branch, git log.

## [0.4.0] - 2025-07-28
- Create PR (GitHub), revert-from-backups, dry-run apply.

## [0.3.0] - 2025-07-26
- Safe file apply, Monaco diff, basic Git (branch → commit → push).

## [0.2.0] - 2025-07-24
- Repo picker, /scan/tree/metadata, FileTree, Prompt Creator, GPT Patch Studio shell.

## [0.1.0] - 2025-07-22
- Electron + FastAPI skeleton, dynamic local HTTP, `/health`.

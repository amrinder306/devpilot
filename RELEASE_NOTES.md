# DevPilot App — v1.0.0-rc.1

This Release Candidate delivers end-to-end local development flow:
- Pick a repo → scan → build prompts
- Paste JSON patches *or* use **Auto-Patch**
- Plan changes with conflict checks
- Apply safely (backups), run tests, commit, push, and open a PR
- Revert via commit/PR when needed

## Highlights
- **Auto-Patch**: Prompt your configured model; DevPilot applies results safely.
- **Providers**: OpenAI (Pro), WebLLM (Dev/offline), or HTTP OpenAI-compatible server.
- **Targeted tests**: Run likely-affected suites only.
- **Revert & Cleanup**: Revert merge commits, close PRs, delete branches.

## Installation
- macOS (Intel/Apple Silicon): `.dmg`
- Windows x64: `.exe`
- Linux: `.AppImage`

> First launch shows a **one-time setup**: telemetry (local-only), provider choice, and keys if needed.

## Known limitations
- Auto-Patch with WebLLM runs in Dev Mode via the UI; engine-side Auto-Patch requires Pro (OpenAI/HTTP).
- Very large files may render slowly in diff/merge views.
- API keys are stored locally (plain). Keychain integration is planned post-1.0.

## Upgrade notes
- Existing settings and backups are preserved in your repo under `.devpilot_backups/`.

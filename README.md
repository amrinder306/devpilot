## Quick Start (Desktop)

1. **Install**
   - macOS: open the `.dmg`, drag DevPilot App to Applications.
   - Windows: run the `.exe` installer.
   - Linux: mark the `.AppImage` as executable and run.

2. **First Run**
   - Choose provider: **Dev (WebLLM)** for offline trials, or **Pro (OpenAI/HTTP)** for best results.
   - (Optional) Toggle telemetry (local-only counters).
   - Done—DevPilot will launch the local engine on a dynamic `localhost` port.

3. **Pick a Repo**
   - Click **Pick Repo & Scan**. DevPilot builds a snapshot (ignoring `node_modules`, `build`, `.git` soon via `.devpilotignore`).

4. **Build & Patch**
   - **Option A (Manual JSON)**: Paste a JSON payload like:
     ```json
     { "files": [ { "path": "src/App.tsx", "code": "<new content>" } ] }
     ```
     Click **Plan** → review diffs → **Apply**.
   - **Option B (Auto-Patch)**: Describe the change in natural language. DevPilot prompts your model, plans changes, and (optionally) applies them.

5. **Test & PR**
   - Keep **Run targeted tests** on to speed up runs.
   - Click **Branch → Tests → Apply → Commit → Push → PR**.
   - DevPilot opens the PR automatically (if enabled).

6. **Revert & Cleanup**
   - Use **Revert** tab to create a **Revert PR** for a merged change, or to **close PRs** / **delete branches**.

### Screenshots
_(Replace with actual images)_
1. Dashboard & repo picker  
2. File tree + Prompt Creator  
3. Patch Studio (plan/merge)  
4. Auto-Patch prompt  
5. Revert panel  
6. Repo settings + PR list

### Troubleshooting
- **No `origin` remote**: PR features need a GitHub remote.
- **No `GITHUB_TOKEN`**: PR list/close won’t work; set environment variable and retry.
- **Port in use**: Electron picks a new dynamic port automatically.
- **Conflicts on apply**: Use the three-way merge modal or enable per-file **Force** (not recommended unless reviewed).

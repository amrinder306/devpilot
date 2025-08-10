# DevPilot App (Desktop + Engine)

Local desktop app (Electron + React) with a bundled Python FastAPI engine.
Electron picks a free port and injects the base URL into the renderer.

## Quick start

### 1) Engine deps
```bash
cd engine
python3 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

rm -rf dist release
npm i
npx tsc -p tsconfig.main.json
npx tsc -p tsconfig.preload.json
# MUST exist now:
ls -la dist/main/main.js dist/preload/index.js

# build renderer
npx vite build
# now dist/ has index.html + assets/
ls -la dist/index.html dist/assets
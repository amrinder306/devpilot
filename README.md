# DevPilot App (Desktop + Engine)

Local desktop app (Electron + React) with a bundled Python FastAPI engine.
Electron picks a free port and injects the base URL into the renderer.

## Quick start

### 1) Engine deps
```bash
cd engine
python3 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

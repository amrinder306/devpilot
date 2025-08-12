# DevPilot Starter (Phase-1, preload fix)

## Desktop
```
cd apps/desktop
npm i
npm run build:main
ELECTRON_DEV=1 npm run dev
```

## Server (DPS)
```
cd apps/dps
docker compose up --build -d
# or: pip install -r requirements.txt && uvicorn app:app --reload --port 8000
```

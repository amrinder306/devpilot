import os
import json
from pathlib import Path
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DevPilot Engine", version="0.2.0")

# allow Vite/Electron dev to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or ["http://localhost:5173"] if you want to be strict
    allow_methods=["*"],
    allow_headers=["*"],
)



STATE: Dict[str, Any] = {
    "repo_root": None,       # absolute string
    "snapshot": {},          # { "relative/path": { "size": int, "ext": str } }
}

@app.get("/health")
def health():
    return {"ok": True, "engine": "devpilot", "version": "0.2.0"}

def build_snapshot(repo_root: Path) -> Dict[str, Any]:
    snap: Dict[str, Any] = {}
    for root, _, files in os.walk(repo_root):
        for f in files:
            p = Path(root) / f
            rel = p.relative_to(repo_root).as_posix()
            try:
                size = p.stat().st_size
            except Exception:
                size = 0
            snap[rel] = {"size": size, "ext": p.suffix.lower()}
    return snap

def build_tree(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    root: Dict[str, Any] = {"name": "/", "path": "", "isDir": True, "children": []}
    index = {"": root}
    for rel in sorted(snapshot.keys()):
        parts = rel.split("/")
        acc = ""
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1
            next_acc = f"{acc}/{part}" if acc else part
            if next_acc not in index:
                node = {
                    "name": part,
                    "path": next_acc,
                    "isDir": not is_last,
                    "children": [] if not is_last else None,
                }
                # attach to parent
                parent = index[acc]
                parent["children"].append(node)  # type: ignore
                index[next_acc] = node
            acc = next_acc
    return root

@app.post("/repo/scan")
def repo_scan(payload: Dict[str, str] = Body(...)):
    repo_root = payload.get("repo_root")
    if not repo_root:
        raise HTTPException(400, "repo_root is required")
    repo_path = Path(repo_root).expanduser().resolve()
    if not repo_path.exists() or not repo_path.is_dir():
        raise HTTPException(404, f"Folder not found: {repo_root}")

    snapshot = build_snapshot(repo_path)
    STATE["repo_root"] = str(repo_path)
    STATE["snapshot"] = snapshot
    return {"ok": True, "files": len(snapshot)}

@app.get("/repo/tree")
def repo_tree():
    if not STATE["snapshot"]:
        return {"root": {"name": "/", "path": "", "isDir": True, "children": []}}
    return {"root": build_tree(STATE["snapshot"])}

@app.get("/repo/metadata")
def repo_metadata(path: str = Query(..., description="relative file path")):
    if not STATE["repo_root"]:
        raise HTTPException(400, "No repo scanned yet")
    rel = Path(path)
    abs_path = Path(STATE["repo_root"]) / rel
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(404, f"File not found: {path}")
    code = abs_path.read_text(encoding="utf-8", errors="ignore")
    return {
        "repo": STATE["repo_root"],
        "file": rel.as_posix(),
        "code": code,
        "snapshot": STATE["snapshot"],
    }


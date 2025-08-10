import os
import json
from pathlib import Path
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os, shutil

from utils.git_task_manager import GitTaskManager

app = FastAPI(title="DevPilot Engine", version="0.3.0")

# allow Vite/Electron dev to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or ["http://localhost:5173"] if you want to be strict
    allow_methods=["*"],
    allow_headers=["*"],
)


STATE: Dict[str, Any] = {
    "repo_root": None,
    "snapshot": {},
}

@app.get("/health")
def health():
    return {"ok": True, "engine": "devpilot", "version": "0.3.0"}

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
                parent = index[acc]
                parent["children"].append(node)  # type: ignore
                index[next_acc] = node
            acc = next_acc
    return root

def _ensure_repo():
    if not STATE["repo_root"]:
        raise HTTPException(400, "No repo scanned yet")

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
    _ensure_repo()
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

# ---------- v0.3: APPLY CHANGES SAFELY ----------
@app.post("/apply")
def apply_changes(payload: Dict[str, Any] = Body(...)):
    """
    payload = { "files": [ { "path": "...", "code": "..." }, ... ] }
    Writes files relative to repo root, creates folders as needed.
    Backs up existing file to .devpilot_backups/<relpath>.bak (single copy).
    """
    _ensure_repo()
    files = payload.get("files")
    if not isinstance(files, list):
        raise HTTPException(400, "files array required")

    repo = Path(STATE["repo_root"])
    backup_root = repo / ".devpilot_backups"
    backup_root.mkdir(exist_ok=True)

    written: List[str] = []
    for f in files:
        rel = f.get("path")
        code = f.get("code")
        if not rel or code is None:
            raise HTTPException(400, "each file needs {path, code}")
        # prevent path traversal
        rel_path = Path(rel)
        if rel_path.is_absolute() or ".." in rel_path.parts:
            raise HTTPException(400, f"invalid path: {rel}")

        abs_path = repo / rel_path
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        # backup once if exists
        if abs_path.exists():
            backup_path = backup_root / (rel_path.as_posix() + ".bak")
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            if not backup_path.exists():
                shutil.copyfile(abs_path, backup_path)

        abs_path.write_text(code, encoding="utf-8")
        written.append(rel_path.as_posix())

    # refresh snapshot for UI
    STATE["snapshot"] = build_snapshot(repo)
    return {"ok": True, "written": written}

# ---------- v0.3: BASIC GIT ACTIONS ----------
@app.post("/git/create-branch")
def git_create_branch(payload: Dict[str, str] = Body(...)):
    _ensure_repo()
    name = payload.get("name")
    if not name:
        raise HTTPException(400, "branch name required")
    g = GitTaskManager(STATE["repo_root"])
    br = g.create_branch(name)
    return {"ok": True, "branch": br}

@app.post("/git/commit")
def git_commit(payload: Dict[str, str] = Body(...)):
    _ensure_repo()
    msg = payload.get("message") or "DevPilot apply"
    g = GitTaskManager(STATE["repo_root"])
    g.add_all()
    g.commit(msg)
    return {"ok": True, "branch": g.current_branch()}

@app.post("/git/push")
def git_push(payload: Dict[str, str] = Body(default={})):
    _ensure_repo()
    remote = payload.get("remote", "origin")
    branch = payload.get("branch")
    g = GitTaskManager(STATE["repo_root"])
    g.push(remote, branch)
    return {"ok": True, "branch": g.current_branch()}

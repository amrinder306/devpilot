import os
import json
from pathlib import Path
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os, shutil

from utils.git_task_manager import GitTaskManager
from dotenv import load_dotenv
import difflib
from datetime import datetime
import subprocess
from openai import OpenAI
# Load the .env file
load_dotenv()
app = FastAPI(title="DevPilot Engine", version="0.3.0")

# allow Vite/Electron dev to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or ["http://localhost:5173"] if you want to be strict
    allow_methods=["*"],
    allow_headers=["*"],
)
LOGS = []  # simple ring buffer
def log(msg: str):
    LOGS.append(msg)
    if len(LOGS) > 500:
        del LOGS[:len(LOGS)-500]

STATE: Dict[str, Any] = {
    "repo_root": None,
    "snapshot": {},
    "settings": {  # new
        "slug_override": None,      # "owner/repo"
        "default_base": None        # e.g. "main"
    }
}
def _read_file_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

def _file_mtime(p: Path) -> float:
    try: return p.stat().st_mtime
    except: return 0.0
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
# ---------- v0.4: APPLY with dry-run ----------
@app.post("/apply")
def apply_changes(payload: Dict[str, Any] = Body(...)):
    """
    payload = { "files": [{ "path": "...", "code": "..." }], "dry_run": bool }
    """
    _ensure_repo()
    files = payload.get("files")
    dry = bool(payload.get("dry_run", False))
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

        rel_path = Path(rel)
        if rel_path.is_absolute() or ".." in rel_path.parts:
            raise HTTPException(400, f"invalid path: {rel}")

        abs_path = repo / rel_path
        if dry:
            # just preview; no write
            written.append(rel_path.as_posix())
            continue

        abs_path.parent.mkdir(parents=True, exist_ok=True)

        if abs_path.exists():
            backup_path = backup_root / (rel_path.as_posix() + ".bak")
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            if not backup_path.exists():
                shutil.copyfile(abs_path, backup_path)

        abs_path.write_text(code, encoding="utf-8")
        written.append(rel_path.as_posix())

    if not dry:
        STATE["snapshot"] = build_snapshot(repo)

    return {"ok": True, "written": written, "dry_run": dry}

# ---------- v0.4: REVERT from backups ----------
@app.post("/revert")
def revert_files(payload: Dict[str, Any] = Body(...)):
    """
    payload = { "paths": ["rel/path.tsx", ...] }
    Restores from .devpilot_backups/<path>.bak if present.
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    backup_root = repo / ".devpilot_backups"
    paths = payload.get("paths") or []
    if not isinstance(paths, list) or not paths:
        raise HTTPException(400, "paths array required")

    restored: List[str] = []
    for rel in paths:
        rel_path = Path(rel)
        if rel_path.is_absolute() or ".." in rel_path.parts:
            raise HTTPException(400, f"invalid path: {rel}")
        src = backup_root / (rel_path.as_posix() + ".bak")
        dst = repo / rel_path
        if not src.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        restored.append(rel_path.as_posix())

    STATE["snapshot"] = build_snapshot(repo)
    return {"ok": True, "restored": restored}

# ---------- v0.4: CREATE PR (GitHub) ----------
@app.post("/git/create-pr")
def git_create_pr(payload: Dict[str, str] = Body(...)):
    """
    Requires env GITHUB_TOKEN.
    payload = { "title": "...", "body": "...", "remote": "origin", "base": "main" }
    If repo slug not provided, inferred from git remote.
    """
    _ensure_repo()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(400, "GITHUB_TOKEN not set in environment")

    title = payload.get("title") or "DevPilot PR"
    body = payload.get("body") or ""
    remote = payload.get("remote") or "origin"
    base = payload.get("base")  # optional; default branch if missing

    g = GitTaskManager(STATE["repo_root"])
    head = g.current_branch()
    if not head:
        raise HTTPException(400, "Could not determine current branch")

    slug = payload.get("slug") or g.repo_slug_from_remote(remote)
    if not slug:
        raise HTTPException(400, "Could not infer repo slug from git remote; pass payload.slug (owner/repo)")

    if not base:
        base = g.default_branch()

    url = f"https://api.github.com/repos/{slug}/pulls"
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        json={"title": title, "body": body, "head": head, "base": base}
    )
    if resp.status_code >= 300:
        raise HTTPException(resp.status_code, f"GitHub PR create failed: {resp.text}")

    return {"ok": True, "pr": resp.json()}

# v0.5: list recent commits
@app.get("/git/log")
def git_log(limit: int = 30):
    _ensure_repo()
    g = GitTaskManager(STATE["repo_root"])
    return {"ok": True, "commits": g.log(limit)}

# v0.5: revert a commit locally (usually the PR merge commit)
@app.post("/git/revert-commit")
def git_revert_commit(payload: Dict[str, str] = Body(...)):
    _ensure_repo()
    sha = payload.get("sha")
    branch = payload.get("branch")  # optional: create/use a revert branch
    remote = payload.get("remote", "origin")
    message = payload.get("message", "revert: automated")
    if not sha:
        raise HTTPException(400, "sha required")

    g = GitTaskManager(STATE["repo_root"])
    g.fetch(remote)

    if branch:
        g.create_branch(branch)

    g.revert_commit(sha, no_edit=True)
    g.commit(message)  # ensure a commit exists (revert produces one)
    return {"ok": True, "branch": g.current_branch()}

# v0.5: delete a branch (local + optional remote)
@app.post("/git/delete-branch")
def git_delete_branch(payload: Dict[str, Any] = Body(...)):
    _ensure_repo()
    name = payload.get("name")
    remote = bool(payload.get("remote", False))
    remote_name = payload.get("remote_name", "origin")
    if not name:
        raise HTTPException(400, "name required")
    g = GitTaskManager(STATE["repo_root"])
    g.delete_branch(name, remote=remote, remote_name=remote_name)
    return {"ok": True}

# v0.5: close an open PR on GitHub
@app.post("/git/close-pr")
def git_close_pr(payload: Dict[str, Any] = Body(...)):
    _ensure_repo()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(400, "GITHUB_TOKEN not set")

    number = payload.get("number")
    remote = payload.get("remote", "origin")
    slug = payload.get("slug")

    if not number:
        raise HTTPException(400, "PR number required")

    g = GitTaskManager(STATE["repo_root"])
    if not slug:
        slug = g.repo_slug_from_remote(remote)
    if not slug:
        raise HTTPException(400, "Could not infer repo slug; pass payload.slug")

    url = f"https://api.github.com/repos/{slug}/pulls/{number}"
    resp = requests.patch(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }, json={"state": "closed"})
    if resp.status_code >= 300:
        raise HTTPException(resp.status_code, f"Close PR failed: {resp.text}")
    return {"ok": True, "pr": resp.json()}

# v0.5: create a revert PR from a merge commit
@app.post("/git/revert-pr")
def git_revert_pr(payload: Dict[str, Any] = Body(...)):
    """
    payload: {
      "merge_sha": "...",                # merge commit SHA of the original PR
      "base": "main",                    # base to target
      "remote": "origin",
      "branch": "revert/<shortsha>",     # new branch name
      "title": "Revert: ...",
      "body": "..."
    }
    """
    _ensure_repo()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(400, "GITHUB_TOKEN not set")

    merge_sha = payload.get("merge_sha")
    base = payload.get("base")
    remote = payload.get("remote", "origin")
    branch = payload.get("branch")
    title = payload.get("title") or "Revert PR"
    body = payload.get("body") or ""

    if not merge_sha:
        raise HTTPException(400, "merge_sha required")

    g = GitTaskManager(STATE["repo_root"])
    g.fetch(remote)
    if not base:
        base = g.default_branch()
    if not branch:
        branch = f"revert/{merge_sha[:7]}"

    # create branch off base and revert
    g.checkout(base)
    g.create_branch(branch)
    g.revert_commit(merge_sha, no_edit=True)
    g.commit(f"revert: {merge_sha}")

    # push and open PR
    g.push(remote, branch)
    slug = g.repo_slug_from_remote(remote)
    if not slug:
        raise HTTPException(400, "Could not infer repo slug from remote")

    url = f"https://api.github.com/repos/{slug}/pulls"
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        json={"title": title, "body": body, "head": branch, "base": base}
    )
    if resp.status_code >= 300:
        raise HTTPException(resp.status_code, f"GitHub PR create failed: {resp.text}")

    return {"ok": True, "pr": resp.json()}

@app.get("/settings")
def get_settings():
    return {"ok": True, "settings": STATE["settings"]}

@app.post("/settings")
def set_settings(payload: Dict[str, Any] = Body(...)):
    s = STATE["settings"]
    if "slug_override" in payload: s["slug_override"] = payload.get("slug_override")
    if "default_base"  in payload: s["default_base"]  = payload.get("default_base")
    if "ai" in payload and isinstance(payload["ai"], dict):
        s_ai = s["ai"]
        for k in ["mode", "provider", "openai_key"]:
            if k in payload["ai"]:
                s_ai[k] = payload["ai"][k]
    return {"ok": True, "settings": s}


@app.get("/logs")
def get_logs():
    return {"ok": True, "lines": LOGS[-400:]}

# helper for constructing Git manager with logging
def _git() -> GitTaskManager:
    _ensure_repo()
    return GitTaskManager(STATE["repo_root"], logger=log)

@app.get("/git/branches")
def git_branches():
    g = _git()
    return {"ok": True, "branches": g.branches(), "current": g.current_branch()}

@app.get("/git/prs")
def git_list_prs(remote: str = "origin", state: str = "open"):
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise HTTPException(400, "GITHUB_TOKEN not set")
    g = _git()
    slug = STATE["settings"].get("slug_override") or g.repo_slug_from_remote(remote)
    if not slug:
        raise HTTPException(400, "Could not infer repo slug; set settings.slug_override")

    url = f"https://api.github.com/repos/{slug}/pulls?state={state}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
    if resp.status_code >= 300:
        raise HTTPException(resp.status_code, f"List PRs failed: {resp.text}")
    return {"ok": True, "prs": resp.json()}

@app.get("/git/remote")
def git_remote(remote: str = "origin"):
    _ensure_repo()
    g = _git()
    url = g.remote_url(remote) or ""
    slug = STATE["settings"].get("slug_override") or g.repo_slug_from_remote(remote)
    host = "github.com" if "github.com" in (url or "") else None
    return {"ok": True, "remote": remote, "url": url, "slug": slug, "host": host}
@app.post("/apply/plan")
def apply_plan(payload: Dict[str, Any] = Body(...)):
    """
    payload = {
      "files": [
        { "path": "...", "code": "...", "expected_current": "..." }  # expected_current optional
      ]
    }
    Returns a plan with create/update/unchanged/conflict and diffs.
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    items = payload.get("files")
    if not isinstance(items, list): raise HTTPException(400, "files array required")

    plan = {"create": [], "update": [], "unchanged": [], "conflict": [], "summary": {}}
    for f in items:
        rel = f.get("path"); new_code = f.get("code", "")
        if not rel: raise HTTPException(400, "each file needs path")
        relp = Path(rel)
        if relp.is_absolute() or ".." in relp.parts: raise HTTPException(400, f"invalid path: {rel}")

        abs_p = repo / relp
        exists = abs_p.exists()
        current = _read_file_text(abs_p)
        expected = f.get("expected_current", None)

        if not exists:
            plan["create"].append({"path": rel, "diff": list(difflib.unified_diff([], new_code.splitlines(), lineterm=""))})
            continue

        if current == new_code:
            plan["unchanged"].append({"path": rel})
            continue

        # conflict detection: if expected_current provided and doesn't match disk, we flag conflict
        if expected is not None and expected != current:
            diff_a = list(difflib.unified_diff(expected.splitlines(), current.splitlines(), fromfile="expected", tofile="current", lineterm=""))
            diff_b = list(difflib.unified_diff(current.splitlines(), new_code.splitlines(), fromfile="current", tofile="proposed", lineterm=""))
            plan["conflict"].append({"path": rel, "diff_expected_vs_current": diff_a, "diff_current_vs_proposed": diff_b})
        else:
            # normal update
            diff = list(difflib.unified_diff(current.splitlines(), new_code.splitlines(), fromfile="current", tofile="proposed", lineterm=""))
            plan["update"].append({"path": rel, "diff": diff})

    plan["summary"] = {k: len(plan[k]) for k in ["create","update","unchanged","conflict"]}
    return {"ok": True, "plan": plan}

# strengthen /apply to optionally enforce expected_current unless force=true
@app.post("/apply/strict")
def apply_strict(payload: Dict[str, Any] = Body(...)):
    """
    payload = {
      "files": [{ "path": "...", "code": "...", "expected_current": "...", "force": bool }],
      "force": false  # global fallback
    }
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    global_force = bool(payload.get("force", False))
    items = payload.get("files") or []
    if not isinstance(items, list): raise HTTPException(400, "files array required")

    backup_root = repo / ".devpilot_backups"
    backup_root.mkdir(exist_ok=True)
    written, conflicts = [], []

    for f in items:
        rel = f.get("path"); code = f.get("code", ""); expected = f.get("expected_current")
        local_force = bool(f.get("force", False)) or global_force
        if not rel: raise HTTPException(400, "each file needs path")
        relp = Path(rel)
        if relp.is_absolute() or ".." in relp.parts: raise HTTPException(400, f"invalid path: {rel}")

        abs_p = repo / relp
        disk = _read_file_text(abs_p)

        if expected is not None and expected != disk and not local_force:
            conflicts.append(relp.as_posix()); continue

        abs_p.parent.mkdir(parents=True, exist_ok=True)
        if abs_p.exists():
            backup = backup_root / (relp.as_posix() + ".bak")
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copyfile(abs_p, backup)
        abs_p.write_text(code, encoding="utf-8")
        written.append(relp.as_posix())

    STATE["snapshot"] = build_snapshot(repo)
    return {"ok": True, "written": written, "conflicts": conflicts, "forced": global_force or any(f.get("force") for f in items)}


@app.post("/apply/plan3")
def apply_plan3(payload: Dict[str, Any] = Body(...)):
    """
    payload.files: [{ path, code, expected_current? }]
    Returns minimal 3-way context for UI (only for files that exist or conflict)
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    items = payload.get("files")
    if not isinstance(items, list): raise HTTPException(400, "files array required")

    out = []
    for f in items:
        rel = f.get("path"); proposed = f.get("code", ""); expected = f.get("expected_current")
        if not rel: raise HTTPException(400, "each file needs path")
        relp = Path(rel)
        if relp.is_absolute() or ".." in relp.parts: raise HTTPException(400, f"invalid path: {rel}")
        abs_p = repo / relp
        current = _read_file_text(abs_p)
        out.append({
            "path": rel,
            "expected": expected if expected is not None else current,  # fallback so 3 panes are always filled
            "current": current,
            "proposed": proposed
        })
    return {"ok": True, "threeway": out}

@app.post("/hooks/run")
def run_hooks(payload: Dict[str, Any] = Body(...)):
    """
    payload = {
      "commands": ["npm test --silent", "npm run lint"],  # sequential
      "timeout": 900  # seconds
    }
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    cmds = payload.get("commands") or []
    timeout = int(payload.get("timeout", 900))
    if not isinstance(cmds, list) or not cmds:
        raise HTTPException(400, "commands array required")

    logs = []
    for cmd in cmds:
        logs.append(f"$ {cmd}")
        try:
            p = subprocess.run(cmd, cwd=str(repo), shell=True, text=True, capture_output=True, timeout=timeout)
            if p.stdout: logs.append(p.stdout.strip())
            if p.stderr: logs.append(p.stderr.strip())
            if p.returncode != 0:
                return {"ok": False, "failed": cmd, "logs": logs}
        except subprocess.TimeoutExpired:
            return {"ok": False, "failed": cmd, "logs": logs + [f"Timed out after {timeout}s"]}
    return {"ok": True, "logs": logs}

def _guess_test_commands(paths: list[str]) -> list[str]:
    # Heuristics for common stacks — customize for your repo later
    cmds = []
    any_js = any(p.endswith((".js",".jsx",".ts",".tsx")) for p in paths)
    any_py = any(p.endswith(".py") for p in paths)
    any_cs = any(p.endswith((".cs",".fs",".vb")) for p in paths)

    if any_js:
        # map src/foo/bar.ts -> tests matching foo|bar
        pats = list({Path(p).stem for p in paths})
        grep = "|".join(pats) or "."
        cmds += [
            "test -f package.json && (npm run -s test -- " + f"-- {grep}" + " || echo 'js tests done')"
        ]
    if any_py:
        # pytest -k "foo or bar"
        pats = list({Path(p).stem for p in paths})
        expr = " or ".join(pats) or ""
        cmds += [
            "test -f pyproject.toml || test -f pytest.ini && (pytest -q " + (f"-k \"{expr}\"" if expr else "") + " || echo 'py tests done')"
        ]
    if any_cs:
        cmds += [
            "ls *.sln 1>/dev/null 2>&1 && dotnet test || echo 'dotnet tests done'"
        ]
    return [c for c in cmds if c]

@app.post("/hooks/targets")
def run_targeted_hooks(payload: Dict[str, Any] = Body(...)):
    """
    payload = { "paths": ["a/b.ts", ...], "timeout": 900 }
    Returns the commands selected + their logs.
    """
    _ensure_repo()
    repo = Path(STATE["repo_root"])
    paths = payload.get("paths") or []
    timeout = int(payload.get("timeout", 900))
    if not isinstance(paths, list) or not paths:
        raise HTTPException(400, "paths array required")

    commands = _guess_test_commands(paths)
    logs = []
    for cmd in commands:
        logs.append(f"$ {cmd}")
        p = subprocess.run(cmd, cwd=str(repo), shell=True, text=True, capture_output=True, timeout=timeout)
        if p.stdout: logs.append(p.stdout.strip())
        if p.stderr: logs.append(p.stderr.strip())
        if p.returncode != 0:
            return {"ok": False, "failed": cmd, "logs": logs, "commands": commands}
    return {"ok": True, "logs": logs, "commands": commands}


def _openai_client() -> OpenAI:
    key = STATE["settings"]["ai"].get("openai_key")
    if not key:
        raise HTTPException(400, "OpenAI key not set in settings.ai.openai_key")
    return OpenAI(api_key=key)

@app.post("/ai/complete")
def ai_complete(payload: Dict[str, Any] = Body(...)):
    """
    payload = { "messages": [{role, content}, ...], "model": "gpt-4o-mini", "max_tokens": 1024, "temperature": 0.2 }
    """
    s = STATE["settings"]["ai"]
    if s.get("mode") != "pro" or s.get("provider") != "openai":
        raise HTTPException(400, "AI not in Pro/OpenAI mode")
    client = _openai_client()
    model = payload.get("model") or "gpt-4o-mini"
    messages = payload.get("messages") or []
    max_tokens = int(payload.get("max_tokens", 1024))
    temperature = float(payload.get("temperature", 0.2))
    try:
        out = client.chat.completions.create(model=model, messages=messages, max_tokens=max_tokens, temperature=temperature)
        return {"ok": True, "output": out.model_dump()}
    except Exception as e:
        raise HTTPException(500, f"OpenAI call failed: {e}")
    
@app.post("/session/export")
def session_export(payload: Dict[str, Any] = Body(default={})):
    """
    Optionally pass { include_snapshot: true }
    """
    include_snapshot = bool(payload.get("include_snapshot", False))
    data = {
        "version": "0.9.0",
        "settings": STATE["settings"],
        "repo_root": STATE["repo_root"],
        "snapshot": STATE["snapshot"] if include_snapshot else {},
    }
    return {"ok": True, "session": data}

@app.post("/session/import")
def session_import(payload: Dict[str, Any] = Body(...)):
    sess = payload.get("session")
    if not isinstance(sess, dict):
        raise HTTPException(400, "session object required")
    # do not overwrite repo_root silently — only accept settings/snapshot
    if "settings" in sess and isinstance(sess["settings"], dict):
        STATE["settings"] = sess["settings"]
    if "snapshot" in sess and isinstance(sess["snapshot"], dict):
        STATE["snapshot"] = sess["snapshot"]
    return {"ok": True, "settings": STATE["settings"], "snapshot_len": len(STATE["snapshot"])}

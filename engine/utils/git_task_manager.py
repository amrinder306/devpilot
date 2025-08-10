import subprocess, os, json
from pathlib import Path
from typing import Optional, List

class GitTaskManager:
    def __init__(self, repo_root: str):
        self.repo_root = str(Path(repo_root).resolve())

    def _run(self, args: List[str]) -> subprocess.CompletedProcess:
        return subprocess.run(["git", "-C", self.repo_root] + args, text=True, capture_output=True, check=False)

    def current_branch(self) -> str:
        r = self._run(["rev-parse", "--abbrev-ref", "HEAD"])
        return r.stdout.strip()

    def default_branch(self) -> str:
        # tries origin/HEAD -> refs
        r = self._run(["symbolic-ref", "refs/remotes/origin/HEAD"])
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip().split("/")[-1]
        # fallback: main or master
        for b in ["main", "master"]:
            r = self._run(["rev-parse", "--verify", b])
            if r.returncode == 0:
                return b
        return self.current_branch() or "main"

    def remote_url(self, remote: str = "origin") -> Optional[str]:
        r = self._run(["remote", "get-url", remote])
        return r.stdout.strip() if r.returncode == 0 else None

    def repo_slug_from_remote(self, remote: str = "origin") -> Optional[str]:
        # support: https://github.com/owner/repo.git or git@github.com:owner/repo.git
        url = self.remote_url(remote) or ""
        url = url.replace(".git", "")
        if "github.com" in url:
            if url.startswith("git@github.com:"):
                return url.split("git@github.com:")[1]
            if "github.com/" in url:
                return url.split("github.com/")[1]
        return None

    def create_branch(self, name: str) -> str:
        r = self._run(["checkout", "-B", name])
        if r.returncode != 0:
            raise RuntimeError(r.stderr or "Failed to create/checkout branch")
        return name

    def add_all(self):
        r = self._run(["add", "-A"])
        if r.returncode != 0:
            raise RuntimeError(r.stderr or "git add failed")

    def commit(self, message: str):
        r = self._run(["commit", "-m", message])
        if r.returncode != 0 and "nothing to commit" not in (r.stderr + r.stdout).lower():
            raise RuntimeError(r.stderr or "git commit failed")

    def push(self, remote: str = "origin", branch: Optional[str] = None):
        br = branch or self.current_branch()
        r = self._run(["push", remote, br])
        if r.returncode != 0:
            raise RuntimeError(r.stderr or "git push failed")

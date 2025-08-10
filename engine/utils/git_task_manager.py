import subprocess
import os
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

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

type Commit = { sha: string; author: string; date: string; message: string };

export default function RevertPanel() {
  const { push, View } = useToasts();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selected, setSelected] = useState<string>("");

  // Revert commit (local/PR)
  const [branch, setBranch] = useState("revert/" + Date.now());
  const [commitMsg, setCommitMsg] = useState("revert: automated");
  const [prTitle, setPrTitle] = useState("Revert: automated");
  const [prBody, setPrBody] = useState("Reverts a previous change.");

  // Close PR
  const [closePrNumber, setClosePrNumber] = useState<string>(""); // number only
  const [closePrSlug, setClosePrSlug] = useState<string>(""); // optional owner/repo

  // Delete branch
  const [deleteBranchName, setDeleteBranchName] = useState<string>("");
  const [deleteRemote, setDeleteRemote] = useState<boolean>(true);
  const [deleteRemoteName, setDeleteRemoteName] = useState<string>("origin");

  const refresh = async () => {
    const data = await apiGet<{ commits: Commit[] }>("/git/log?limit=40");
    setCommits(data.commits);
  };

  useEffect(() => { refresh(); }, []);

  const revertCommitLocal = async () => {
    if (!selected) return push("Select a commit", "err");
    try {
      await apiPost("/git/revert-commit", { sha: selected, branch, message: commitMsg });
      await apiPost("/git/push", {});
      push("Revert commit pushed ✅", "ok");
    } catch (e: any) {
      push("Revert failed: " + (e?.message || e), "err");
    }
  };

  const openRevertPR = async () => {
    if (!selected) return push("Select a commit (merge sha)", "err");
    try {
      const pr = await apiPost("/git/revert-pr", {
        merge_sha: selected,
        branch,
        title: prTitle,
        body: prBody
      });
      const url = pr?.pr?.html_url || "(PR created)";
      push("Revert PR opened ✅ " + url, "ok");
    } catch (e: any) {
      push("Revert PR failed: " + (e?.message || e), "err");
    }
  };

  const closePr = async () => {
    if (!closePrNumber) return push("Enter a PR number", "err");
    try {
      const payload: any = { number: Number(closePrNumber) };
      if (closePrSlug.trim()) payload.slug = closePrSlug.trim();
      const pr = await apiPost("/git/close-pr", payload);
      const url = pr?.pr?.html_url || "(PR closed)";
      push("PR closed ✅ " + url, "ok");
    } catch (e: any) {
      push("Close PR failed: " + (e?.message || e), "err");
    }
  };

  const deleteBranch = async () => {
    if (!deleteBranchName.trim()) return push("Enter branch name", "err");
    try {
      await apiPost("/git/delete-branch", {
        name: deleteBranchName.trim(),
        remote: deleteRemote,
        remote_name: deleteRemoteName.trim() || "origin",
      });
      push("Branch deleted" + (deleteRemote ? " (local+remote)" : " (local)") + " ✅", "ok");
    } catch (e: any) {
      push("Delete branch failed: " + (e?.message || e), "err");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", height: "100%", gap: 12 }}>
      <View />

      {/* Commits list */}
      <div style={{ borderRight: "1px solid #eee", paddingRight: 8, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h4 style={{ margin: 0 }}>Recent commits</h4>
          <button onClick={refresh}>Refresh</button>
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {commits.map(c => (
            <li key={c.sha}
                onClick={() => setSelected(c.sha)}
                style={{ padding: 8, cursor: "pointer", background: selected === c.sha ? "#eef5ff" : "transparent" }}>
              <div style={{ fontFamily: "monospace" }}>{c.sha.slice(0, 12)} — {c.message}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{c.author} · {c.date}</div>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 8 }}>
          <strong>Selected SHA:</strong> <code>{selected || "(none)"}</code>
        </div>
      </div>

      {/* Revert workflows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h4 style={{ margin: 0 }}>Revert workflows</h4>
        <label>Revert branch</label>
        <input value={branch} onChange={(e) => setBranch(e.target.value)} />
        <label>Commit message</label>
        <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={revertCommitLocal}>Revert commit → push</button>
          <button onClick={openRevertPR}>Create Revert PR</button>
        </div>

        <hr/>

        <h4 style={{ margin: 0 }}>Close PR</h4>
        <label>PR number</label>
        <input inputMode="numeric" value={closePrNumber} onChange={(e) => setClosePrNumber(e.target.value)} />
        <label style={{ fontSize: 12, opacity: 0.8 }}>Repo slug (optional, owner/repo). If blank, inferred from git remote.</label>
        <input placeholder="owner/repo (optional)" value={closePrSlug} onChange={(e) => setClosePrSlug(e.target.value)} />
        <button onClick={closePr} style={{ marginTop: 8 }}>Close PR</button>
      </div>

      {/* Delete branch */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h4 style={{ margin: 0 }}>Delete branch</h4>
        <label>Branch name</label>
        <input placeholder="feature/something" value={deleteBranchName} onChange={(e) => setDeleteBranchName(e.target.value)} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={deleteRemote} onChange={(e) => setDeleteRemote(e.target.checked)} />
          Also delete on remote
        </label>
        <label>Remote name</label>
        <input value={deleteRemoteName} onChange={(e) => setDeleteRemoteName(e.target.value)} />
        <button onClick={deleteBranch} style={{ marginTop: 8 }}>Delete branch</button>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Tip: after merging a PR, delete the feature branch here (both local and remote).
        </div>
      </div>
    </div>
  );
}

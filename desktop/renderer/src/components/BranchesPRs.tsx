import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

export default function BranchesPRs() {
  const { push, View } = useToasts();
  const [current, setCurrent] = useState("");
  const [local, setLocal] = useState<string[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [prs, setPrs] = useState<any[]>([]);
  const [closeNumber, setCloseNumber] = useState("");

  const refreshBranches = async () => {
    const res = await apiGet<{ branches: { local: string[]; remote: string[] }, current: string }>("/git/branches");
    setCurrent(res.current);
    setLocal(res.branches.local || []);
    setRemote(res.branches.remote || []);
  };
  const refreshPRs = async () => {
    try {
      const res = await apiGet<{ prs: any[] }>("/git/prs");
      setPrs(res.prs);
    } catch (e: any) {
      setPrs([]);
      push("PR list failed (configure GITHUB_TOKEN and slug)", "err");
    }
  };

  useEffect(() => { refreshBranches(); refreshPRs(); }, []);

  const checkout = async () => {
    if (!selectedBranch) return;
    try {
      await apiPost("/git/create-branch", { name: selectedBranch }); // checkout -B acts as checkout
      push("Checked out " + selectedBranch, "ok");
      refreshBranches();
    } catch (e: any) {
      push("Checkout failed: " + (e?.message || e), "err");
    }
  };

  const closePR = async (n?: number) => {
    const num = n || Number(closeNumber);
    if (!num) return push("Enter/select a PR number", "err");
    try {
      await apiPost("/git/close-pr", { number: num });
      push("PR #" + num + " closed", "ok");
      refreshPRs();
    } catch (e: any) {
      push("Close PR failed: " + (e?.message || e), "err");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <View />
      <div>
        <h4>Branches</h4>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Current: <code>{current}</code></div>
        <label>Local branches</label>
        <ul>{local.map(b => (
          <li key={b} onClick={() => setSelectedBranch(b)} style={{ cursor: "pointer", background: selectedBranch === b ? "#eef5ff" : "transparent" }}>{b}</li>
        ))}</ul>
        <label>Remote branches</label>
        <ul>{remote.map(b => (
          <li key={b} onClick={() => setSelectedBranch(b.replace("origin/", ""))} style={{ cursor: "pointer" }}>{b}</li>
        ))}</ul>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="branch name" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} />
          <button onClick={checkout}>Checkout</button>
        </div>
      </div>
      <div>
        <h4>Open PRs</h4>
        {prs.length === 0 && <div>No open PRs (or fetch failed)</div>}
        <ul style={{ paddingLeft: 0, listStyle: "none" }}>
          {prs.map(pr => (
            <li key={pr.number} style={{ marginBottom: 10, padding: 8, border: "1px solid #eee" }}>
              <div><strong>#{pr.number}</strong> {pr.title}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{pr.head?.ref} → {pr.base?.ref}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={() => closePR(pr.number)}>Close</button>
                <a href={pr.html_url} target="_blank">Open on GitHub</a>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="PR number" value={closeNumber} onChange={(e) => setCloseNumber(e.target.value)} />
          <button onClick={() => closePR()}>Close PR</button>
        </div>
      </div>
    </div>
  );
}

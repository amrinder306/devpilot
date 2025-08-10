import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

const DEFAULTS = [
  ".git/**","node_modules/**","dist/**","build/**",".venv/**",".devpilot_backups/**","*.lock","*.min.*"
];

export default function IgnoreEditor() {
  const { push, View } = useToasts();
  const [userText, setUserText] = useState(DEFAULTS.join("\n"));
  const [repoText, setRepoText] = useState("");
  const [saveToRepo, setSaveToRepo] = useState(true);

  const load = async () => {
    try {
      const user = await apiGet<{ patterns: string[] }>("/ignore");
      setUserText((user.patterns?.length ? user.patterns : DEFAULTS).join("\n"));
    } catch { setUserText(DEFAULTS.join("\n")); }
    try {
      const repo = await apiGet<{ patterns: string[] }>("/ignore/repo");
      setRepoText((repo.patterns || []).join("\n"));
    } catch { setRepoText(""); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const listUser = userText.split("\n").map(s => s.trim()).filter(Boolean);
    await apiPost("/ignore", { patterns: listUser });
    if (saveToRepo) {
      const listRepo = repoText.split("\n").map(s => s.trim()).filter(Boolean);
      await apiPost("/ignore/repo", { patterns: listRepo });
    } else {
      // still rescan with current effective ignores
      await apiPost("/repo/rescan", {});
    }
    push("Ignore rules saved & rescanned", "ok");
  };

  const resetDefaults = async () => {
    setUserText(DEFAULTS.join("\n"));
    push("User ignores reset to defaults (not saved yet)", "ok");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <View />
      <div>
        <h4>User ignore patterns</h4>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Applied to all repos (stored in app settings).</div>
        <textarea value={userText} onChange={e => setUserText(e.target.value)} style={{ height: 140, width: "100%", fontFamily: "monospace" }} />
        <button onClick={resetDefaults} style={{ marginTop: 6 }}>Reset to defaults</button>
      </div>
      <div>
        <h4>Repo <code>.devpilotignore</code></h4>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Saved in the repo root so rules travel with the code.</div>
        <textarea value={repoText} onChange={e => setRepoText(e.target.value)} placeholder="# one glob per line" style={{ height: 140, width: "100%", fontFamily: "monospace" }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <input type="checkbox" checked={saveToRepo} onChange={(e)=>setSaveToRepo(e.target.checked)} />
          Save repo rules to <code>.devpilotignore</code>
        </label>
      </div>
      <div style={{ gridColumn: "1 / span 2", display: "flex", gap: 8 }}>
        <button onClick={save}>Save & Rescan</button>
        <button onClick={load}>Reload</button>
      </div>
    </div>
  );
}

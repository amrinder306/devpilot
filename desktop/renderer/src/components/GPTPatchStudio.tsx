import { useEffect, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

type GptFile = { path: string; code: string; current?: string; apply?: boolean };

export default function GPTPatchStudio() {
  const [raw, setRaw] = useState("");
  const [files, setFiles] = useState<GptFile[]>([]);
  const [branch, setBranch] = useState("devpilot/patch-" + Date.now());
  const [commitMsg, setCommitMsg] = useState("chore(devpilot): apply GPT patch");
  const [dry, setDry] = useState(true);
  const [prTitle, setPrTitle] = useState("DevPilot: applied patch");
  const [prBody, setPrBody] = useState("Automated patch via DevPilot App.");
  const { push, View } = useToasts();

  const parse = async () => {
    try {
      const obj = JSON.parse(raw);
      if (!Array.isArray(obj.files)) throw new Error("JSON must contain a 'files' array");
      const filled: GptFile[] = [];
      for (const f of obj.files) {
        let current = "";
        try {
          const meta = await apiGet<{ code: string }>("/repo/metadata?path=" + encodeURIComponent(f.path));
          current = meta.code || "";
        } catch { current = ""; }
        filled.push({ path: f.path, code: f.code, current, apply: true });
      }
      setFiles(filled);
      push("Parsed files", "ok");
    } catch (e: any) {
      push("Parse error: " + e.message, "err");
    }
  };

  const selected = files.filter(f => f.apply);
  const toggleApply = (p: string) => setFiles(prev => prev.map(f => f.path === p ? { ...f, apply: !f.apply } : f));

  const doApply = async () => {
    if (selected.length === 0) return push("Nothing selected to apply", "err");
    try {
      await apiPost("/apply", { files: selected.map(({ path, code }) => ({ path, code })), dry_run: dry });
      push(dry ? "Dry-run simulated ✅" : "Applied ✅", "ok");
    } catch (e: any) {
      push("Apply failed: " + (e?.message || e), "err");
    }
  };

  const doRevert = async () => {
    if (selected.length === 0) return push("Select files to revert", "err");
    try {
      await apiPost("/revert", { paths: selected.map(s => s.path) });
      push("Reverted from backups (if present) ✅", "ok");
    } catch (e: any) {
      push("Revert failed: " + (e?.message || e), "err");
    }
  };

  const doGitFlow = async () => {
    try {
      await apiPost("/git/create-branch", { name: branch });
      await apiPost("/apply", { files: selected.map(({ path, code }) => ({ path, code })), dry_run: false });
      await apiPost("/git/commit", { message: commitMsg });
      await apiPost("/git/push", {});
      const pr = await apiPost("/git/create-pr", { title: prTitle, body: prBody });
      const url = pr?.pr?.html_url || "(PR created)";
      push("Pushed and opened PR ✅ " + url, "ok");
    } catch (e: any) {
      push("Git flow failed: " + (e?.message || e), "err");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "210px 1fr", height: "100%", gap: 8 }}>
      <View />
      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Paste GPT response (JSON)</div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ flex: 1, height: 140, fontFamily: "monospace" }} />
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={parse} style={{ padding: "6px 10px" }}>Parse</button>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={dry} onChange={(e) => setDry(e.target.checked)} />
              Dry-run apply
            </label>
            <button onClick={doApply} style={{ padding: "6px 10px" }}>Apply Selected</button>
            <button onClick={doRevert} style={{ padding: "6px 10px" }}>Revert Selected</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Git + PR</div>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Branch name</label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} />
          <label style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Commit message</label>
          <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
          <label style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>PR title</label>
          <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
          <label style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>PR body</label>
          <textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} style={{ height: 60 }} />
          <button onClick={doGitFlow} style={{ marginTop: 8, padding: "6px 10px" }}>
            Create branch → Apply → Commit → Push → Open PR
          </button>
        </div>
      </div>

      {/* Diffs */}
      <div style={{ overflow: "auto" }}>
        {files.length === 0 && <div>No files parsed yet</div>}
        {files.map((f) => (
          <div key={f.path} style={{ marginBottom: 18, border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", padding: 8, gap: 12, background: "#fafafa" }}>
              <input type="checkbox" checked={!!f.apply} onChange={() => toggleApply(f.path)} />
              <strong>{f.path}</strong>
            </div>
            <div style={{ height: 300 }}>
              <DiffEditor
                original={f.current ?? ""}
                modified={f.code ?? ""}
                language={guessLanguage(f.path)}
                options={{ readOnly: false, automaticLayout: true }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function guessLanguage(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".cs")) return "csharp";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

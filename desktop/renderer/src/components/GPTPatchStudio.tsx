import { useEffect, useMemo, useState } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { apiGet, apiPost } from "../lib/api";

type GptFile = { path: string; code: string; current?: string; apply?: boolean };

export default function GPTPatchStudio() {
  const [raw, setRaw] = useState("");
  const [files, setFiles] = useState<GptFile[]>([]);
  const [branch, setBranch] = useState("devpilot/patch-" + Date.now());
  const [commitMsg, setCommitMsg] = useState("chore(devpilot): apply GPT patch");

  const parse = async () => {
    try {
      const obj = JSON.parse(raw);
      if (!Array.isArray(obj.files)) throw new Error("JSON must contain a 'files' array");
      // Fetch current for each file (if exists)
      const filled: GptFile[] = [];
      for (const f of obj.files) {
        let current = "";
        try {
          const meta = await apiGet<{ code: string }>(
            "/repo/metadata?path=" + encodeURIComponent(f.path)
          );
          current = meta.code || "";
        } catch {
          current = ""; // new file
        }
        filled.push({ path: f.path, code: f.code, current, apply: true });
      }
      setFiles(filled);
    } catch (e: any) {
      alert("Parse error: " + e.message);
    }
  };

  const toggleApply = (p: string) =>
    setFiles((prev) => prev.map((f) => (f.path === p ? { ...f, apply: !f.apply } : f)));

  const doApply = async () => {
    const toWrite = files.filter((f) => f.apply).map(({ path, code }) => ({ path, code }));
    if (toWrite.length === 0) return alert("Nothing selected to apply");
    await apiPost("/apply", { files: toWrite });
    alert("Applied. Backup created at .devpilot_backups/");
  };

  const doGitFlow = async () => {
    await apiPost("/git/create-branch", { name: branch });
    await doApply();
    await apiPost("/git/commit", { message: commitMsg });
    await apiPost("/git/push", {});
    alert("Pushed! Open your remote to create a PR.");
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "180px 1fr", height: "100%", gap: 8 }}>
      {/* Top controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Paste GPT response (JSON)</div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ flex: 1, height: 120, fontFamily: "monospace" }} />
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <button onClick={parse} style={{ padding: "6px 10px" }}>Parse</button>
            <button onClick={doApply} style={{ padding: "6px 10px" }}>Apply Selected</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Git Flow</div>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Branch name</label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} />
          <label style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Commit message</label>
          <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
          <button onClick={doGitFlow} style={{ marginTop: 8, padding: "6px 10px" }}>
            Create branch → Apply → Commit → Push
          </button>
        </div>
      </div>

      {/* Diff list */}
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
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".cs")) return "csharp";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

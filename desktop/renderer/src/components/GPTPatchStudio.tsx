import { useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

type GptFile = { path: string; code: string; current?: string; apply?: boolean };

export default function GPTPatchStudio() {
  const { push, View } = useToasts();
  const [raw, setRaw] = useState("");
  const [files, setFiles] = useState<GptFile[]>([]);
  const [plan, setPlan] = useState<any | null>(null);
  const [force, setForce] = useState(false);
  const [branch, setBranch] = useState("devpilot/patch-" + Date.now());
  const [commitMsg, setCommitMsg] = useState("chore(devpilot): apply GPT patch");

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
      setPlan(null);
      push("Parsed files", "ok");
    } catch (e: any) {
      push("Parse error: " + e.message, "err");
    }
  };

  const buildPlan = async () => {
    if (files.length === 0) return push("Parse a response first", "err");
    const selected = files.filter(f => f.apply);
    if (selected.length === 0) return push("Select at least one file", "err");
    const body = {
      files: selected.map(f => ({ path: f.path, code: f.code, expected_current: f.current ?? null }))
    };
    const res = await apiPost("/apply/plan", body);
    setPlan(res.plan);
    if (res.plan.summary.conflict > 0) {
      push(`Plan ready — conflicts: ${res.plan.summary.conflict}`, "err");
    } else {
      push("Plan ready", "ok");
    }
  };

  const applyStrict = async () => {
    if (!plan) return push("Generate a plan first", "err");
    const selected = files.filter(f => f.apply);
    const body = {
      files: selected.map(f => ({ path: f.path, code: f.code, expected_current: f.current ?? null })),
      force
    };
    const res = await apiPost("/apply/strict", body);
    if (res.conflicts?.length && !force) {
      push(`Stopped: ${res.conflicts.length} conflict(s)`, "err");
      return;
    }
    push(res.forced ? "Applied with force ✅" : "Applied ✅", "ok");
  };

  const doGitFlow = async () => {
    await apiPost("/git/create-branch", { name: branch });
    await applyStrict();
    await apiPost("/git/commit", { message: commitMsg });
    await apiPost("/git/push", {});
    push("Pushed. Create PR from Repo tab.", "ok");
  };

  const toggleApply = (p: string) => setFiles(prev => prev.map(f => f.path === p ? { ...f, apply: !f.apply } : f));

  return (
    <div style={{ display: "grid", gridTemplateRows: "210px 180px 1fr", height: "100%", gap: 8 }}>
      <View />
      {/* Input */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Paste GPT response (JSON)</div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ flex: 1, height: 140, fontFamily: "monospace" }} />
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={parse}>Parse</button>
            <button onClick={buildPlan}>Plan</button>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Force on conflict
            </label>
            <button onClick={applyStrict}>Apply</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Git</div>
          <label>Branch</label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} />
          <label style={{ marginTop: 6 }}>Commit message</label>
          <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
          <button onClick={doGitFlow} style={{ marginTop: 8 }}>
            Branch → Apply (strict) → Commit → Push
          </button>
        </div>
      </div>

      {/* Plan summary */}
      <div style={{ border: "1px solid #eee", padding: 8, background: "#fafafa" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Apply Plan</div>
        {!plan && <div>No plan yet.</div>}
        {plan && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>Create: <strong>{plan.summary.create}</strong></div>
            <div>Update: <strong>{plan.summary.update}</strong></div>
            <div>Unchanged: <strong>{plan.summary.unchanged}</strong></div>
            <div style={{ color: plan.summary.conflict ? "#b42318" : "#1a7f37" }}>
              Conflicts: <strong>{plan.summary.conflict}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Diffs */}
      <div style={{ overflow: "auto" }}>
        {files.length === 0 && <div>No files parsed yet</div>}
        {files.map((f) => {
          const conflict = plan?.conflict?.some((c: any) => c.path === f.path);
          const update   = plan?.update?.some((c: any) => c.path === f.path);
          const create   = plan?.create?.some((c: any) => c.path === f.path);
          return (
            <div key={f.path} style={{ marginBottom: 18, border: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", padding: 8, gap: 12, background: conflict ? "#fff2f0" : create ? "#f0fff4" : "#fafafa" }}>
                <input type="checkbox" checked={!!f.apply} onChange={() => toggleApply(f.path)} />
                <strong>{f.path}</strong>
                {conflict && <span style={{ color: "#b42318" }}>⚠ conflict (disk changed since prompt)</span>}
                {create && <span style={{ color: "#1a7f37" }}>new file</span>}
                {update && !conflict && <span>update</span>}
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
          );
        })}
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

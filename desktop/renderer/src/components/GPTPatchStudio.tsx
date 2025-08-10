import { useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";
import ThreeWayMerge from "./ThreeWayMerge";
import { saveAs } from "./saveAs"; // new helper below

type GptFile = { path: string; code: string; current?: string; apply?: boolean; force?: boolean };

export default function GPTPatchStudio() {
  const { push, View } = useToasts();
  const [raw, setRaw] = useState("");
  const [files, setFiles] = useState<GptFile[]>([]);
  const [plan, setPlan] = useState<any | null>(null);
  const [branch, setBranch] = useState("devpilot/patch-" + Date.now());
  const [commitMsg, setCommitMsg] = useState("chore(devpilot): apply GPT patch");
  const [runHooks, setRunHooks] = useState(true);
  const [mergeTarget, setMergeTarget] = useState<any | null>(null); // for modal
  const [createPR, setCreatePR] = useState(true);
  const [prTitle, setPrTitle] = useState("DevPilot: apply patch");
  const [prBody, setPrBody]   = useState("Automated patch via DevPilot App.");
  const [useTargetedTests, setUseTargetedTests] = useState(true);

  const selected = useMemo(() => files.filter(f => f.apply), [files]);
  const selectedPaths = useMemo(() => selected.map(f => f.path), [selected]);
  // add two helpers:
    const runHooksTargeted = async () => {
        const res = await apiPost("/hooks/targets", { paths: selectedPaths });
        return res?.ok;
    };
    const exportSession = async () => {
        const exp = await apiPost("/session/export", { include_snapshot: false });
        const body = {
          devpilot_version: "0.9",
          files: selected.map(({ path, code, current }) => ({ path, code, expected_current: current || "" })),
          plan,
          session: exp.session
        };
        const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
        saveAs(blob, "devpilot-session.json");
      };
      const importSession = async (file: File) => {
        const txt = await file.text();
        const obj = JSON.parse(txt);
        if (obj?.session) {
          await apiPost("/session/import", { session: obj.session });
        }
        if (Array.isArray(obj?.files)) {
          // load back into Patch Studio
          const filled: GptFile[] = [];
          for (const f of obj.files) {
            let current = "";
            try { const meta = await apiGet<{ code: string }>("/repo/metadata?path=" + encodeURIComponent(f.path)); current = meta.code || ""; } catch {}
            filled.push({ path: f.path, code: f.code, current, apply: true, force: false });
          }
          setFiles(filled);
          setPlan(obj.plan || null);
        }
      };
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
        filled.push({ path: f.path, code: f.code, current, apply: true, force: false });
      }
      setFiles(filled);
      setPlan(null);
      push("Parsed files", "ok");
    } catch (e: any) {
      push("Parse error: " + e.message, "err");
    }
  };

  const buildPlan = async () => {
    if (!selected.length) return push("Select at least one file", "err");
    const res = await apiPost("/apply/plan", {
      files: selected.map(f => ({ path: f.path, code: f.code, expected_current: f.current ?? null }))
    });
    setPlan(res.plan);
    push(res.plan.summary.conflict ? `Plan: ${res.plan.summary.conflict} conflict(s)` : "Plan ready", res.plan.summary.conflict ? "err" : "ok");
  };

  const openMerge = async (path: string) => {
    // fetch 3-way data for that file
    const f = files.find(x => x.path === path)!;
    const res = await apiPost("/apply/plan3", { files: [{ path: f.path, code: f.code, expected_current: f.current ?? null }] });
    setMergeTarget(res.threeway[0]);
  };

  const applyStrict = async () => {
    if (!selected.length) return push("Nothing selected", "err");
    const body = {
      files: selected.map(f => ({ path: f.path, code: f.code, expected_current: f.current ?? null, force: !!f.force }))
    };
    const res = await apiPost("/apply/strict", body);
    if (res.conflicts?.length) {
      push(`Blocked by ${res.conflicts.length} conflict(s). Resolve via Merge UI or toggle force per file.`, "err");
      return;
    }
    push("Applied ✅", "ok");
  };

  // update doGitFlow:
const doGitFlow = async () => {
    await apiPost("/git/create-branch", { name: branch });
    // targeted or full hooks
    if (useTargetedTests) {
      const ok = await runHooksTargeted();
      if (!ok) { push("Targeted tests failed. Aborting.", "err"); return; }
    } else {
      const hooks = await apiPost("/hooks/run", guessHooks());
      if (!hooks?.ok) { push("Pre-commit hooks failed. Aborting.", "err"); return; }
    }
    await applyStrict();
    await apiPost("/git/commit", { message: commitMsg });
    await apiPost("/git/push", {});
    if (createPR) {
      const pr = await apiPost("/git/create-pr", { title: prTitle, body: prBody });
      const url = pr?.pr?.html_url || "(PR created)";
      push("Pushed & opened PR ✅ " + url, "ok");
    } else {
      push("Pushed. PR not created (toggle in UI).", "ok");
    }
  };

  const toggleApply = (p: string) => setFiles(prev => prev.map(f => f.path === p ? { ...f, apply: !f.apply } : f));
  const toggleForce = (p: string) => setFiles(prev => prev.map(f => f.path === p ? { ...f, force: !f.force } : f));

  return (
    <div style={{ display: "grid", gridTemplateRows: "210px 200px 1fr", height: "100%", gap: 8 }}>
      <View />
      {mergeTarget && (
        <ThreeWayMerge
          file={mergeTarget}
          onClose={() => setMergeTarget(null)}
          onApply={(merged, force) => {
            // replace proposed with merged, set force if chosen
            setFiles(prev => prev.map(f => f.path === mergeTarget.path ? { ...f, code: merged, force: force || f.force } : f));
            setMergeTarget(null);
            push("Merged buffer staged for apply", "ok");
          }}
        />
      )}

      {/* Input & controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Paste GPT response (JSON)</div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ flex: 1, height: 140, fontFamily: "monospace" }} />
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={parse}>Parse</button>
            <button onClick={buildPlan}>Plan</button>
            <button onClick={applyStrict}>Apply</button>
            <button onClick={exportSession}>Export Session</button>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="file" accept="application/json" onChange={(e) => e.target.files && importSession(e.target.files[0])} />
                Import Session
            </label>
            </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Git</div>
          <label>Branch</label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} />
            <label>Commit message</label>
            <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={useTargetedTests} onChange={(e) => setUseTargetedTests(e.target.checked)} />
                Run targeted tests
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={createPR} onChange={(e) => setCreatePR(e.target.checked)} />
                Auto-create PR
            </label>
            </div>
            <label>PR title</label>
            <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
            <label>PR body</label>
            <textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} style={{ height: 60 }} />
            <button onClick={doGitFlow} style={{ marginTop: 8 }}>Branch → Tests → Apply → Commit → Push → {createPR ? "PR" : "Done"}</button>
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
          return (
            <div key={f.path} style={{ marginBottom: 18, border: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", padding: 8, gap: 12, background: conflict ? "#fff2f0" : "#fafafa" }}>
                <input type="checkbox" checked={!!f.apply} onChange={() => toggleApply(f.path)} />
                <strong>{f.path}</strong>
                {conflict && <button onClick={() => openMerge(f.path)}>Open 3-way merge</button>}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                  <input type="checkbox" checked={!!f.force} onChange={() => toggleForce(f.path)} />
                  Force this file
                </label>
              </div>
              <div style={{ height: 280 }}>
                <DiffEditor original={f.current ?? ""} modified={f.code ?? ""} language={guess(f.path)} options={{ automaticLayout: true }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function guess(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".cs")) return "csharp";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

function guessHooks() {
  // very light heuristics; customize as needed
  return {
    commands: [
      "git --version",
      // JS/TS projects:
      "test -f package.json && (npm run -s lint || echo 'no lint')",
      "test -f package.json && (npm test --silent || echo 'no tests')",
      // Python:
      "test -f pyproject.toml && (pytest -q || echo 'no pytest')",
      // .NET:
      "test -f global.json || test -d *.sln && (dotnet test || echo 'no dotnet tests')"
    ],
    timeout: 900
  };
}

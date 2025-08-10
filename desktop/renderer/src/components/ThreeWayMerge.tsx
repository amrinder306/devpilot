import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

type Props = {
  file: { path: string; expected: string; current: string; proposed: string };
  onClose(): void;
  onApply(mergedCode: string, force: boolean): void;
};

export default function ThreeWayMerge({ file, onClose, onApply }: Props) {
  const [merged, setMerged] = useState(file.proposed);
  const [force, setForce] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "grid", gridTemplateRows: "48px 1fr 56px" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 12px" }}>
        <strong>Three-way merge:</strong>&nbsp;<code>{file.path}</code>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 8, background: "#fff" }}>
        <Pane title="Expected (at prompt time)">
          <Editor height="320px" language={guess(file.path)} value={file.expected} options={{ readOnly: true, automaticLayout: true }} />
        </Pane>
        <Pane title="Current (on disk)">
          <Editor height="320px" language={guess(file.path)} value={file.current} options={{ readOnly: true, automaticLayout: true }} />
        </Pane>
        <Pane title="Proposed (from model)">
          <Editor height="320px" language={guess(file.path)} value={file.proposed} options={{ readOnly: true, automaticLayout: true }} />
        </Pane>

        <div style={{ gridColumn: "1 / span 3" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Merged output (edit as needed)</div>
          <Editor height="240px" language={guess(file.path)} value={merged} onChange={(v) => setMerged(v || "")} options={{ automaticLayout: true }} />
        </div>
      </div>

      <div style={{ background: "#fff", borderTop: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 12px", gap: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force apply (override disk even if mismatch)
        </label>
        <button onClick={() => onApply(merged, force)} style={{ marginLeft: "auto" }}>Apply merged</button>
      </div>
    </div>
  );
}

function Pane({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
function guess(p: string) {
  if (p.endsWith(".ts") || p.endsWith(".tsx")) return "typescript";
  if (p.endsWith(".js") || p.endsWith(".jsx")) return "javascript";
  if (p.endsWith(".py")) return "python";
  if (p.endsWith(".cs")) return "csharp";
  if (p.endsWith(".json")) return "json";
  if (p.endsWith(".md")) return "markdown";
  return "plaintext";
}

import { useState } from "react";

type GptFile = { path: string; code: string };

export default function GPTPatchStudio() {
  const [raw, setRaw] = useState("");
  const [files, setFiles] = useState<GptFile[]>([]);

  const parse = () => {
    try {
      const obj = JSON.parse(raw);
      if (!Array.isArray(obj.files)) throw new Error("JSON must contain a 'files' array");
      setFiles(obj.files);
    } catch (e: any) {
      alert("Parse error: " + e.message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 12 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Paste GPT response (JSON)</div>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ flex: 1, fontFamily: "monospace" }} />
        <button onClick={parse} style={{ marginTop: 8, padding: "8px 12px", cursor: "pointer" }}>
          Parse
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Parsed Files</div>
        {files.length === 0 && <div>No files yet</div>}
        {files.map((f) => (
          <div key={f.path} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>{f.path}</div>
            <pre style={{ background: "#111", color: "#eee", padding: 8 }}>{f.code}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

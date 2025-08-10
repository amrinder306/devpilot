import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

type Meta = {
  repo: string;
  file: string;
  code: string;
  snapshot: Record<string, any>;
};

export default function PromptCreator({ selectedFile }: { selectedFile: string | null }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    (async () => {
      if (!selectedFile) { setMeta(null); return; }
      const data = await apiGet<Meta>("/repo/metadata?path=" + encodeURIComponent(selectedFile));
      setMeta(data);
    })();
  }, [selectedFile]);

  const defaultPrompt = useMemo(() => {
    if (!meta) return "";
    const snapshotJson = JSON.stringify(meta.snapshot, null, 2);
    const codeBlock = "```" + (meta.file.endsWith(".tsx") ? "tsx" : meta.file.endsWith(".ts") ? "ts" : "") + "\n" + meta.code + "\n```";
    return [
      "You are an AI Code Assistant helping me improve or modify the following file.",
      "",
      `## Repo: ${meta.repo}`,
      `## File: ${meta.file}`,
      "",
      "### 🧠 Current Code:",
      codeBlock,
      "",
      "### 📦 Repo Snapshot (selected):",
      "```json",
      snapshotJson,
      "```",
      "",
      "### ✅ Task:",
      "- Explain the change briefly then output patch files.",
      "- If creating new files, include full paths.",
      "",
      "### 🧾 Response format (STRICT):",
      "```json",
      "{",
      '  "files": [',
      '    { "path": "...", "code": "FULL NEW CONTENT" }',
      "  ]",
      "}",
      "```"
    ].join("\n");
  }, [meta]);

  useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Prompt Creator</div>
      {!meta && <div>Select a file to load context…</div>}
      {meta && (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ flex: 1, width: "100%", fontFamily: "monospace" }}
          />
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            Copy this into ChatGPT (Dev Mode) or your model of choice (Pro Mode).
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useToasts } from "../lib/toast";

// lazy import; prevents bundling model at build time
export default function WebLLMPanel() {
  const { push, View } = useToasts();
  const [ready, setReady] = useState(false);
  const engineRef = useRef<any>(null);
  const [prompt, setPrompt] = useState("Summarize this repo’s purpose in one line.");

  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const webllm = await import("@mlc-ai/web-llm");
        // pick a tiny default model; users can change via devtools later
        const initProgressCallback = (report: any) => {
          // silently load; you can surface report.text if desired
        };
        const engine = await webllm.CreateMLCEngine("Llama-3-8B-Instruct-q4f16_1-MLC", { initProgressCallback });
        engineRef.current = engine;
        setReady(true);
        push("WebLLM ready (model downloaded in browser cache)", "ok");
      } catch (e: any) {
        push("WebLLM failed to init: " + (e?.message || e), "err");
      }
    })();
  }, []);

  const run = async () => {
    if (!engineRef.current) return;
    const output = await engineRef.current.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 256
    });
    alert(output?.choices?.[0]?.message?.content || "(no output)");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <View />
      <h4>WebLLM (offline, in-browser)</h4>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        First run will download a small quantized model (cached by the browser). Keep this for Dev Mode experiments.
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ height: 100 }} />
      <button onClick={run} disabled={!ready}>{ready ? "Run locally" : "Loading model…"}</button>
    </div>
  );
}

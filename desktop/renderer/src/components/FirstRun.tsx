import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function FirstRun({ onDone }: { onDone: () => void }) {
  const [telemetry, setTelemetry] = useState(false);
  const [provider, setProvider] = useState<"dev-webllm"|"pro-openai"|"pro-http">("dev-webllm");
  const [openaiKey, setOpenaiKey] = useState("");
  const [httpEndpoint, setHttpEndpoint] = useState("http://127.0.0.1:8080/v1/chat/completions");

  const save = async () => {
    const ai = (provider === "dev-webllm")
      ? { mode: "dev", provider: "webllm" }
      : provider === "pro-openai"
        ? { mode: "pro", provider: "openai", openai_key: openaiKey }
        : { mode: "pro", provider: "http", http_endpoint: httpEndpoint };
    await apiPost("/settings", {
      first_run_done: true,
      telemetry: { enabled: telemetry },
      ai
    });
    onDone();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 10000 }}>
      <div style={{ width: 560, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        <h3>Welcome to DevPilot</h3>
        <ol>
          <li><strong>Telemetry (optional):</strong> store local-only counts (runs, files applied).</li>
          <li><strong>AI provider:</strong> choose Dev Mode (WebLLM offline) or Pro (OpenAI / HTTP server).</li>
        </ol>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={telemetry} onChange={(e)=>setTelemetry(e.target.checked)} />
          Enable local telemetry
        </label>

        <div style={{ marginTop: 12 }}>
          <label>Provider</label>
          <select value={provider} onChange={(e)=>setProvider(e.target.value as any)}>
            <option value="dev-webllm">Dev (WebLLM, offline)</option>
            <option value="pro-openai">Pro (OpenAI)</option>
            <option value="pro-http">Pro (HTTP local server)</option>
          </select>
        </div>

        {provider === "pro-openai" && (
          <>
            <label>OpenAI API Key</label>
            <input type="password" placeholder="sk-..." value={openaiKey} onChange={(e)=>setOpenaiKey(e.target.value)} />
          </>
        )}
        {provider === "pro-http" && (
          <>
            <label>HTTP endpoint</label>
            <input value={httpEndpoint} onChange={(e)=>setHttpEndpoint(e.target.value)} />
            <div style={{ fontSize: 12, opacity: 0.7 }}>Expected OpenAI-compatible JSON schema.</div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={save}>Continue</button>
        </div>
      </div>
    </div>
  );
}

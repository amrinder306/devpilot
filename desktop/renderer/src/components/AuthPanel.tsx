import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

export default function AuthPanel() {
  const { push, View } = useToasts();
  const [mode, setMode] = useState<"dev"|"pro">("dev");
  const [provider, setProvider] = useState<"openai"|"codellama"|"webllm">("openai");
  const [openaiKey, setOpenaiKey] = useState("");

  useEffect(() => {
    (async () => {
      const s = await apiGet<{ settings: any }>("/settings");
      const ai = s.settings?.ai || {};
      setMode(ai.mode || "dev");
      setProvider(ai.provider || "openai");
      setOpenaiKey(ai.openai_key || "");
    })();
  }, []);

  const save = async () => {
    // light validation
    if (mode === "pro" && provider === "openai" && openaiKey && !openaiKey.startsWith("sk-")) {
      return push("OpenAI key format looks invalid", "err");
    }
    await apiPost("/settings", { ai: { mode, provider, openai_key: openaiKey || null }});
    push("AI settings saved", "ok");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
      <View />
      <h4>AI / Pro Mode</h4>
      <label>Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
        <option value="dev">Dev Mode (ChatGPT-in-browser)</option>
        <option value="pro">Pro Mode (API/Local models)</option>
      </select>
      <label>Provider</label>
      <select value={provider} onChange={(e) => setProvider(e.target.value as any)}>
        <option value="openai">OpenAI</option>
        <option value="codellama">Code Llama (local/server)</option>
        <option value="webllm">WebLLM (browser)</option>
      </select>
      {mode === "pro" && provider === "openai" && (
        <>
          <label>OpenAI API Key</label>
          <input type="password" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            We only store this locally in the engine settings. Calls are not made yet.
          </div>
        </>
      )}
      <button onClick={save} style={{ width: 140, marginTop: 6 }}>Save</button>
    </div>
  );
}

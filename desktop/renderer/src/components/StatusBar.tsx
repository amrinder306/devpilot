import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function StatusBar() {
  const [branch, setBranch] = useState<string>("");
  const [remote, setRemote] = useState<{ url?: string; slug?: string } | null>(null);
  const [health, setHealth] = useState<"ok"|"warn"|"down">("warn");
  const [latency, setLatency] = useState<number | null>(null);

  const tick = async () => {
    try {
      const b = await apiGet<{ current: string; branches: any }>("/git/branches");
      setBranch(b.current || "");
    } catch {}
    try {
      const r = await apiGet<{ url: string; slug?: string }>("/git/remote");
      setRemote({ url: r.url, slug: r.slug });
    } catch {}

    // health ping with latency
    try {
      const t0 = performance.now();
      const h = await apiGet<{ ok: boolean }>("/health");
      const dt = performance.now() - t0;
      setLatency(Math.round(dt));
      setHealth(h.ok ? (dt > 800 ? "warn" : "ok") : "down");
    } catch {
      setLatency(null);
      setHealth("down");
    }
  };

  useEffect(() => {
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  const dot = health === "ok" ? "#16a34a" : health === "warn" ? "#ca8a04" : "#dc2626";

  return (
    <div style={{ height: 26, display: "flex", alignItems: "center", gap: 16, padding: "0 10px", borderTop: "1px solid #eee", fontSize: 12, color: "#555" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <i style={{ width: 8, height: 8, borderRadius: 8, background: dot, display: "inline-block" }} />
        Engine {health.toUpperCase()} {latency !== null ? `(${latency}ms)` : ""}
      </span>
      <span>Branch: <code>{branch || "-"}</code></span>
      <span>Remote: <code>{remote?.slug || remote?.url || "-"}</code></span>
    </div>
  );
}

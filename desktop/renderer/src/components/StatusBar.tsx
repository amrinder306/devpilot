import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function StatusBar() {
  const [branch, setBranch] = useState<string>("");
  const [remote, setRemote] = useState<{ url?: string; slug?: string } | null>(null);

  const tick = async () => {
    try {
      const b = await apiGet<{ current: string; branches: any }>("/git/branches");
      setBranch(b.current || "");
    } catch {}
    try {
      const r = await apiGet<{ url: string; slug?: string }>("/git/remote");
      setRemote({ url: r.url, slug: r.slug });
    } catch {}
  };

  useEffect(() => {
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: 26, display: "flex", alignItems: "center", gap: 16,
      padding: "0 10px", borderTop: "1px solid #eee", fontSize: 12, color: "#555"
    }}>
      <span>Branch: <code>{branch || "-"}</code></span>
      <span>Remote: <code>{remote?.slug || remote?.url || "-"}</code></span>
    </div>
  );
}

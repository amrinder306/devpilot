import { useEffect, useState } from "react";

type Q = { id: number; text: string; resolve: (v: boolean) => void };

export function useConfirm() {
  const [q, setQ] = useState<Q | null>(null);

  const ask = (text: string) =>
    new Promise<boolean>((resolve) => {
      setQ({ id: Date.now(), text, resolve });
    });

  const View = () =>
    q ? (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "grid", placeItems: "center", zIndex: 10000
      }}>
        <div style={{ background: "#fff", borderRadius: 8, padding: 16, width: 420, boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Please confirm</div>
          <div style={{ marginBottom: 16 }}>{q.text}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { q.resolve(false); setQ(null); }}>Cancel</button>
            <button onClick={() => { q.resolve(true); setQ(null); }} style={{ background: "#1a7f37", color: "#fff", border: 0, padding: "6px 12px", borderRadius: 4 }}>Confirm</button>
          </div>
        </div>
      </div>
    ) : null;

  return { ask, View };
}

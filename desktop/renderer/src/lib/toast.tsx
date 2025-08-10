import { useEffect, useState } from "react";

export function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string; type?: "ok"|"err" }[]>([]);
  const push = (text: string, type: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const View = () => (
    <div style={{ position: "fixed", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "8px 12px",
          background: t.type === "err" ? "#e5484d" : "#1a7f37",
          color: "white",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
        }}>{t.text}</div>
      ))}
    </div>
  );
  return { push, View };
}

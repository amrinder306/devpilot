import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";

export default function LogsPanel() {
  const [lines, setLines] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const tick = async () => {
    try {
      const res = await apiGet<{ lines: string[] }>("/logs");
      setLines(res.lines || []);
    } catch {}
  };

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div ref={ref} style={{ height: "100%", overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#0b0b0e", color: "#c7c9d1", padding: 12 }}>
      {lines.length === 0 ? <div>Waiting for logs…</div> : lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

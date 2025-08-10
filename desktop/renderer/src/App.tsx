import { useState } from "react";
import RepoPicker from "./components/RepoPicker";
import FileTree from "./components/FileTree";
import PromptCreator from "./components/PromptCreator";
import GPTPatchStudio from "./components/GPTPatchStudio";

export default function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  return (
    <div style={{ display: "grid", gridTemplateRows: "48px 1fr", height: "100vh" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", borderBottom: "1px solid #eee" }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>DevPilot App</h3>
        <RepoPicker onScanned={() => setRefresh((x) => x + 1)} />
        {selected && <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>Selected: {selected}</div>}
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 1fr", height: "100%" }}>
        <div style={{ borderRight: "1px solid #eee", padding: 8 }}>
          <FileTree key={refresh} onSelect={(p) => setSelected(p)} />
        </div>
        <div style={{ borderRight: "1px solid #eee", padding: 8 }}>
          <PromptCreator selectedFile={selected} />
        </div>
        <div style={{ padding: 8 }}>
          <GPTPatchStudio />
        </div>
      </div>
    </div>
  );
}

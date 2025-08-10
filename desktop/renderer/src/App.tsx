import { useEffect, useState } from "react";
import RepoPicker from "./components/RepoPicker";
import FileTree from "./components/FileTree";
import PromptCreator from "./components/PromptCreator";
import GPTPatchStudio from "./components/GPTPatchStudio";
import RevertPanel from "./components/RevertPanel";
import BranchesPRs from "./components/BranchesPRs";
import RepoSettings from "./components/RepoSettings";
import LogsPanel from "./components/LogsPanel";
import StatusBar from "./components/StatusBar";
import AuthPanel from "./components/AuthPanel";
import WebLLMPanel from "./components/WebLLMPanel";
import FirstRun from "./components/FirstRun";
import { apiGet } from "./lib/api";

export default function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"build"|"revert"|"repo"|"logs">("build");
  const [firstRun, setFirstRun] = useState(false);
  useEffect(() => { (async () => {
    const s = await apiGet<{ settings:any }>("/settings");
    setFirstRun(!s.settings?.first_run_done);
  })(); }, []);
  
  return (
    <div style={{ display: "grid", gridTemplateRows: "48px 40px 1fr 26px", height: "100vh" }}>
      {firstRun && <FirstRun onDone={() => setFirstRun(false)} />}
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", borderBottom: "1px solid #eee" }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>DevPilot App</h3>
        <RepoPicker onScanned={() => setRefresh((x) => x + 1)} />
        {selected && <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>Selected: {selected}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, padding: "0 12px", alignItems: "center", borderBottom: "1px solid #eee" }}>
        <button onClick={() => setTab("build")}  style={{ padding: "6px 10px", fontWeight: tab==="build"?700:400 }}>Build & PR</button>
        <button onClick={() => setTab("revert")} style={{ padding: "6px 10px", fontWeight: tab==="revert"?700:400 }}>Revert & Cleanup</button>
        <button onClick={() => setTab("repo")}   style={{ padding: "6px 10px", fontWeight: tab==="repo"?700:400 }}>Repo</button>
        <button onClick={() => setTab("logs")}   style={{ padding: "6px 10px", fontWeight: tab==="logs"?700:400 }}>Logs</button>
      </div>

      {/* Body */}
      {tab === "build" && (
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
      )}
      {tab === "revert" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
          <div style={{ padding: 8, borderRight: "1px solid #eee" }}>
            <RevertPanel />
          </div>
          <div style={{ padding: 8 }}>
            <BranchesPRs />
          </div>
        </div>
      )}
      {tab === "repo" && (
        <div style={{ padding: 8, height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 16 }}>
            <RepoSettings />
            <AuthPanel />
            <WebLLMPanel />
          </div>
          <BranchesPRs />
        </div>
      )}
      {tab === "logs" && (
        <div style={{ padding: 0, height: "100%" }}>
          <LogsPanel />
        </div>
      )}
       <StatusBar />
    </div>
  );
}

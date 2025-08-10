import { apiPost } from "../lib/api";

export default function RepoPicker({ onScanned }: { onScanned: () => void }) {
  const pick = async () => {
    const path = await window.DevPilot.pickRepo();
    if (!path) return;
    await apiPost("/repo/scan", { repo_root: path });
    onScanned();
  };

  return (
    <button onClick={pick} style={{ padding: "8px 12px", cursor: "pointer" }}>
      Pick Repo & Scan
    </button>
  );
}

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useToasts } from "../lib/toast";

export default function RepoSettings() {
  const { push, View } = useToasts();
  const [slug, setSlug] = useState("");
  const [base, setBase] = useState("");

  useEffect(() => {
    (async () => {
      const res = await apiGet<{ settings: any }>("/settings");
      setSlug(res.settings?.slug_override || "");
      setBase(res.settings?.default_base || "");
    })();
  }, []);

  const save = async () => {
    await apiPost("/settings", { slug_override: slug || null, default_base: base || null });
    push("Settings saved", "ok");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
      <View />
      <h4>Repo Settings</h4>
      <label>Repo slug override (owner/repo)</label>
      <input placeholder="owner/repo (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <label>Default base branch</label>
      <input placeholder="e.g. main" value={base} onChange={(e) => setBase(e.target.value)} />
      <button onClick={save} style={{ width: 160 }}>Save</button>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Tip: If the remote isn’t GitHub or slug inference fails, set the slug override here.
      </div>
    </div>
  );
}

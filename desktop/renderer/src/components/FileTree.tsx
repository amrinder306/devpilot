import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

type Node = {
  name: string;
  path: string;
  isDir: boolean;
  children?: Node[];
};

export default function FileTree({ onSelect }: { onSelect: (path: string) => void }) {
  const [tree, setTree] = useState<Node | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "": true });

  useEffect(() => {
    (async () => {
      const data = await apiGet<{ root: Node }>("/repo/tree");
      setTree(data.root);
    })();
  }, []);

  const toggle = (p: string) => setExpanded((e) => ({ ...e, [p]: !e[p] }));

  const renderNode = (n: Node) => {
    if (!n) return null;
    const isOpen = !!expanded[n.path];
    return (
      <div key={n.path} style={{ marginLeft: n.path ? 12 : 0 }}>
        {n.isDir ? (
          <div onClick={() => toggle(n.path)} style={{ cursor: "pointer" }}>
            {isOpen ? "📂" : "📁"} {n.name}
          </div>
        ) : (
          <div onClick={() => onSelect(n.path)} style={{ cursor: "pointer" }}>
            📝 {n.name}
          </div>
        )}
        {n.isDir && isOpen && n.children && n.children.map((c) => renderNode(c))}
      </div>
    );
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      {tree ? renderNode(tree) : <div>Loading tree…</div>}
    </div>
  );
}

import { useState } from "react";

export default function ExportPanel() {
  const [path, setPath] = useState(".");
  const [name, setName] = useState("workspace");

  return (
    <div className="panel-card">
      <h2>Export</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Zip any directory in this workspace and download it via /api/export.
        For a single template, use the Export button on the Templates panel instead.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          Path (relative to repo root)
          <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="." />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          Archive name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="workspace" />
        </label>
      </div>
      <a href={`/api/export?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`}>
        <button>Download .zip</button>
      </a>
    </div>
  );
}

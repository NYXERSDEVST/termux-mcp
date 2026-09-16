import { useState } from "react";

const VIEWPORTS = [
  { label: "Desktop", width: 1280, height: 800 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Phone", width: 390, height: 844 },
];

export default function DevicePreviewPanel() {
  const [url, setUrl] = useState("http://localhost:5173");
  const [viewport, setViewport] = useState(VIEWPORTS[0]);
  const [loadedUrl, setLoadedUrl] = useState(url);

  return (
    <div className="panel-card">
      <h2>Device Preview</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          style={{ flex: 1, minWidth: 200 }}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setLoadedUrl(url);
          }}
          placeholder="URL to preview"
        />
        <button onClick={() => setLoadedUrl(url)}>Load</button>
        {VIEWPORTS.map((v) => (
          <button
            key={v.label}
            onClick={() => setViewport(v)}
            style={{ borderColor: viewport.label === v.label ? "var(--accent)" : undefined }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div
        style={{
          width: viewport.width,
          height: viewport.height,
          maxWidth: "100%",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <iframe
          title="device-preview"
          src={loadedUrl}
          style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
        />
      </div>
    </div>
  );
}

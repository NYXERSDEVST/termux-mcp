import { useEffect, useState } from "react";

interface TemplateEntry {
  slug: string;
  name: string;
  description: string;
  stack: string;
}

export default function TemplatesPanel() {
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json() as Promise<{ templates: TemplateEntry[] }>)
      .then((data) => setTemplates(data.templates))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel-card">
      <h2>Templates / Store</h2>
      {loading && <p style={{ color: "var(--muted)" }}>Loading templates…</p>}
      {!loading && templates.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No templates found under templates/.</p>
      )}
      <div className="template-grid">
        {templates.map((t) => (
          <div key={t.slug} className="panel-card" style={{ background: "#0e0f12" }}>
            <h3 style={{ marginTop: 0 }}>{t.name}</h3>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{t.description}</p>
            <p style={{ fontSize: 12, color: "var(--accent)" }}>{t.stack}</p>
            <a
              href={`/api/export?path=${encodeURIComponent(`templates/${t.slug}`)}&name=${encodeURIComponent(t.slug)}`}
            >
              <button>Export .zip</button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

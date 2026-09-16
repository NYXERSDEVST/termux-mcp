import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import CliPanel from "./panels/CliPanel";
import CopilotPanel from "./panels/CopilotPanel";
import DevicePreviewPanel from "./panels/DevicePreviewPanel";
import ExportPanel from "./panels/ExportPanel";
import TemplatesPanel from "./panels/TemplatesPanel";
import TerminalPanel from "./panels/TerminalPanel";

const NAV_ITEMS = [
  { path: "/terminal", label: "Terminal" },
  { path: "/copilot", label: "Copilot" },
  { path: "/preview", label: "Device Preview" },
  { path: "/cli", label: "CLI" },
  { path: "/templates", label: "Templates / Store" },
  { path: "/export", label: "Export" },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Nyxers Cloud Dev</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/terminal" replace />} />
          <Route path="/terminal" element={<TerminalPanel />} />
          <Route path="/copilot" element={<CopilotPanel />} />
          <Route path="/preview" element={<DevicePreviewPanel />} />
          <Route path="/cli" element={<CliPanel />} />
          <Route path="/templates" element={<TemplatesPanel />} />
          <Route path="/export" element={<ExportPanel />} />
        </Routes>
      </main>
    </div>
  );
}

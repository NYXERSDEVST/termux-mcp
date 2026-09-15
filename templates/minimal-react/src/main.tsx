import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [count, setCount] = React.useState(0);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 40 }}>
      <h1>Minimal React</h1>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");
ReactDOM.createRoot(rootElement).render(<App />);

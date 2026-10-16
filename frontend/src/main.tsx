import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AppProvider, useRoute } from "./app/state.tsx";
import { Shell } from "./app/Shell.tsx";
import { Home } from "./screens/Home.tsx";
import { Booth } from "./screens/Booth.tsx";
import { Report } from "./screens/Report.tsx";
import { Reel } from "./ui/parts.tsx";

// ponytail: pages not built yet say so inside the real frame; each is mocked on the design canvas
const NEXT: Record<string, string> = { drills: "Drills", progress: "Progress", texts: "Your texts", guide: "Guide", data: "Your data" };

function Soon({ page }: { page: string }) {
  return (
    <Shell page={page}>
      <div className="card" style={{ alignItems: "flex-start" }}>
        <Reel state="think" size={160} />
        <h1 className="h1">{NEXT[page]} is next.</h1>
        <p className="body" style={{ margin: 0 }}>This page is designed and being built. Today's plan works now.</p>
        <a className="btn primary" href="#/">▶ TODAY'S PLAN</a>
      </div>
    </Shell>
  );
}

function App() {
  const [page, arg] = useRoute();
  if (page === "drill" && arg) return <Booth id={arg} />;
  if (page === "report") return <Report />;
  if (page && NEXT[page]) return <Soon page={page} />;
  return <Home />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><AppProvider><App /></AppProvider></StrictMode>
);

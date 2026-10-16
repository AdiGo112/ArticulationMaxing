import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { AppProvider, useRoute } from "./app/state.tsx";
import { Home } from "./screens/Home.tsx";
import { Booth } from "./screens/Booth.tsx";
import { Report } from "./screens/Report.tsx";
import { Drills } from "./screens/Drills.tsx";
import { Progress } from "./screens/Progress.tsx";
import { Texts } from "./screens/Texts.tsx";
import { Guide } from "./screens/Guide.tsx";
import { Data } from "./screens/Data.tsx";

const PAGES: Record<string, () => React.JSX.Element> = { drills: Drills, progress: Progress, texts: Texts, guide: Guide, data: Data };

function App() {
  const [page, arg] = useRoute();
  if (page === "drill" && arg) return <Booth id={arg} />;
  if (page === "report") return <Report />;
  const Page = PAGES[page || ""];
  return Page ? <Page /> : <Home />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><AppProvider><App /></AppProvider></StrictMode>
);

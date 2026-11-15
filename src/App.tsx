import {
  Component,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SurfaceStory } from "./components/SurfaceStory";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { MissionTicker } from "./components/MissionTicker";
import { Features } from "./components/Features";
import { InvestigationFlow } from "./components/InvestigationFlow";
import { PlanetAtlas } from "./components/PlanetAtlas";
import { Regions } from "./components/Regions";
import { Telemetry } from "./components/Telemetry";
import { Footer } from "./components/Footer";
import { CustomCursor } from "./components/CustomCursor";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="page-width flex min-h-svh flex-col items-start justify-center gap-5">
          <h1 className="text-4xl">A brief interruption.</h1>
          <p className="text-muted">
            MarsView could not load this view. Reload the page to try again.
          </p>
          <button
            className="button-primary"
            onClick={() => window.location.reload()}
          >
            Reload MarsView
          </button>
        </main>
      );
    return this.props.children;
  }
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const update = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    document.title = "MarsView — A new perspective on Mars";
    if (route) {
      const id = route.slice(1);
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ behavior: "auto" }),
      );
    }
  }, [route]);

  return (
    <ErrorBoundary>
      <CustomCursor />

      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView();
        }}
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-copper px-5 py-3 text-sm font-semibold text-void focus:translate-y-0"
      >
        Skip to content
      </a>

      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <MissionTicker />
        <Features />
        <PlanetAtlas />
        <SurfaceStory />
        <Regions />
        <InvestigationFlow />
        <Telemetry />
      </main>
      <Footer />
    </ErrorBoundary>
  );
}

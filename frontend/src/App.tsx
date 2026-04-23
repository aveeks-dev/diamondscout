import { Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Rankings from "./pages/Rankings";
import PitcherDetail from "./pages/PitcherDetail";
import Streamers from "./pages/Streamers";
import Trends from "./pages/Trends";
import TwoStart from "./pages/TwoStart";
import Prospects from "./pages/Prospects";

export default function App() {
  const today = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-full">
      <header className="border-b border-ink-line sticky top-0 z-20 bg-ink-bg/85 backdrop-blur">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex items-end justify-between pt-5 pb-3">
            <Link to="/" className="flex items-baseline gap-3">
              <span className="display text-[28px] leading-none">Diamond Scout</span>
              <span className="text-xs text-ink-dim hidden sm:block">
                MLB pitcher research
              </span>
            </Link>
            <div className="num text-2xs text-ink-dim tracking-widest uppercase">
              {today}
            </div>
          </div>
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
            <NavTab to="/">Board</NavTab>
            <NavTab to="/prospects">Prospects</NavTab>
            <NavTab to="/streamers">Streamers</NavTab>
            <NavTab to="/rankings">Rankings</NavTab>
            <NavTab to="/trends">Trends</NavTab>
            <NavTab to="/two-start">Two-Start</NavTab>
          </nav>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-8 py-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/streamers" element={<Streamers />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/two-start" element={<TwoStart />} />
          <Route path="/pitcher/:id" element={<PitcherDetail />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-line py-6">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between text-2xs text-ink-faint tracking-wider uppercase">
          <span>Diamond Scout · by Aveek</span>
          <span>Data: MLB Stats API · ESPN Fantasy · Open-Meteo</span>
        </div>
      </footer>
    </div>
  );
}

function NavTab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "px-3 py-2.5 text-[13px] tracking-wide",
          "border-b-2 transition-colors",
          isActive
            ? "border-accent text-ink-text"
            : "border-transparent text-ink-dim hover:text-ink-text",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

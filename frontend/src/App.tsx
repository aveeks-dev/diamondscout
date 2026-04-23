import { Link, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Rankings from "./pages/Rankings";
import PitcherDetail from "./pages/PitcherDetail";
import Streamers from "./pages/Streamers";
import Trends from "./pages/Trends";
import TwoStart from "./pages/TwoStart";
import Prospects from "./pages/Prospects";

export default function App() {
  return (
    <div className="min-h-full">
      <header className="border-b border-field-line/60 bg-field-bg/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl tracking-widest text-diamond-gold">◆</span>
            <span className="font-display text-2xl tracking-widest">DIAMOND SCOUT</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavTab to="/">Board</NavTab>
            <NavTab to="/streamers">Streamers</NavTab>
            <NavTab to="/prospects">Prospects</NavTab>
            <NavTab to="/rankings">Rankings</NavTab>
            <NavTab to="/trends">Trends</NavTab>
            <NavTab to="/two-start">Two-Start</NavTab>
          </nav>
          <div className="ml-auto text-xs text-field-mute hidden md:block">
            fantasy baseball · pitcher research
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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

      <footer className="border-t border-field-line/60 py-6 text-center text-xs text-field-mute">
        Data via MLB Stats API · Matchup score is a heuristic, not a projection system
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
        `px-2 py-1 rounded-md transition-colors ${
          isActive ? "text-diamond-gold" : "text-field-chalk/80 hover:text-field-chalk"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

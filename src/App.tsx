import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Selector } from "./Selector";
import { Stats } from "./Stats";
import "./index.css";

function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
        <span className="font-serif text-xl tracking-widest text-white font-bold">SPACE APPS</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest text-gray-400">
        <Link to="/" className={`hover:text-white transition-colors ${location.pathname === "/" ? "text-white" : ""}`}>CHALLENGES</Link>
        <Link to="/stats" className={`hover:text-white transition-colors ${location.pathname === "/stats" ? "text-white" : ""}`}>STATS</Link>
        <Link to="/?filter=winners" className={`hover:text-white transition-colors ${location.search.includes("filter=winners") ? "text-white" : ""}`}>WINNERS</Link>
      </div>

      <div className="w-32 md:flex hidden"></div>
    </nav>
  );
}

export function App() {
  return (
    <Router>
      <div className="min-h-screen text-white overflow-x-hidden">
        <Navbar />
        <main className="pt-20 min-h-screen">
          <Routes>
            <Route path="/" element={<Selector />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

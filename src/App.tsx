import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Selector } from "./Selector";
import { Stats } from "./Stats";
import { motion, AnimatePresence } from "framer-motion";
import "./index.css";

function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/30 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-3">
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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Selector />
            </motion.div>
          }
        />
        <Route
          path="/stats"
          element={
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Stats />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <Router>
      <div className="min-h-screen text-white overflow-x-hidden">
        <Navbar />
        <main className="pt-20 min-h-screen">
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
}

export default App;


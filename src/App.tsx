import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Home } from "./Home";
import { Explore } from "./Explore";
import { Report } from "./Report";
import { motion, AnimatePresence } from "framer-motion";
import { AVAILABLE_YEARS, useYear } from "./year";
import "./index.css";

function OrbitMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="16" cy="16" r="5.5" />
      <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-28 16 16)" />
      <circle cx="27.2" cy="10.4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Navbar() {
  const location = useLocation();
  const year = useYear();
  const params = new URLSearchParams(location.search);

  const yearLink = (target: number) => {
    const next = new URLSearchParams(location.search);
    next.set("year", String(target));
    next.delete("pagina");
    return `${location.pathname}?${next.toString()}`;
  };

  const premios = params.getAll("premio");
  const isWinners = location.pathname === "/explorar" && premios.length === 1 && premios[0] === "ganador";
  const isExplore = location.pathname === "/explorar" && !isWinners;
  const isReport = location.pathname === "/reporte";

  return (
    <nav className="masthead" aria-label="Navegación principal">
      <div className="shell flex h-[72px] items-center justify-between gap-3">
        <Link to={`/?year=${year}`} className="flex items-center gap-3">
          <span className="brand-mark">
            <OrbitMark />
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-medium text-primary">NASA Space Apps</span>
            <span className="block text-xs text-tertiary">Archivo orbital · 2023–2025</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link to={`/explorar?year=${year}`} className="nav-link" aria-current={isExplore ? "page" : undefined}>
            Explorar
          </Link>
          <Link to={`/reporte?year=${year}`} className="nav-link" aria-current={isReport ? "page" : undefined}>
            Reporte
          </Link>
          <Link to={`/explorar?premio=ganador&year=${year}`} className="nav-link" aria-current={isWinners ? "page" : undefined}>
            Ganadores
          </Link>
        </div>

        <div className="year-switch" aria-label="Seleccionar edición">
          {AVAILABLE_YEARS.map((option) => (
            <Link
              key={option}
              to={yearLink(option)}
              className="year-tab"
              aria-current={year === option ? "true" : undefined}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const year = useYear();
  return (
    <footer className="mt-16 border-t border-subtle">
      <div className="shell flex flex-col gap-2 py-7 sm:flex-row sm:items-center sm:justify-between">
        <span className="meta">NASA Space Apps Challenge</span>
        <span className="meta">
          {year} · Fuente: <a className="text-secondary underline underline-offset-4 hover:text-primary" href="https://www.spaceappschallenge.org" target="_blank" rel="noopener noreferrer">spaceappschallenge.org</a>
        </span>
      </div>
    </footer>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Home />
            </motion.div>
          }
        />
        <Route
          path="/explorar"
          element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Explore />
            </motion.div>
          }
        />
        <Route
          path="/reporte"
          element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Report />
            </motion.div>
          }
        />
        <Route path="/stats" element={<Navigate to={`/reporte${location.search}`} replace />} />
        <Route path="/ganadores" element={<Navigate to={`/explorar?premio=ganador${location.search ? `&${location.search.slice(1)}` : ""}`} replace />} />
        <Route path="*" element={<Navigate to={`/${location.search}`} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <Router>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <div className="flex min-h-screen flex-col text-primary">
        <Navbar />
        <main id="contenido" className="flex-1 pt-[72px]">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

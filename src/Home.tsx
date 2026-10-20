import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useYear } from "./year";
import type { StatsReport } from "./statsData";

const EXAMPLES: Array<{ label: string; params: Record<string, string> }> = [
  { label: "exoplanetas", params: { q: "exoplanetas" } },
  { label: "agua", params: { q: "agua" } },
  { label: "Brasil", params: { pais: "Brazil" } },
  { label: "ganadores", params: { premio: "ganador" } },
];

export function Home() {
  const year = useYear();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<StatsReport | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stats?year=${year}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: StatsReport | null) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      });
    return () => { cancelled = true; };
  }, [year]);

  const goToExplore = (params: Record<string, string>) => {
    const search = new URLSearchParams({ year: String(year), ...params });
    navigate(`/explorar?${search.toString()}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    goToExplore(query.trim() ? { q: query.trim() } : {});
  };

  const stats = [
    { label: "Proyectos", value: report?.metrics.totalProjects, to: `/reporte?year=${year}#participacion` },
    { label: "Países", value: report?.metrics.countries, to: `/reporte?year=${year}#geografia` },
    { label: "Ubicaciones", value: report?.metrics.localEvents, to: `/reporte?year=${year}#geografia` },
  ];

  return (
    <div className="shell py-10 md:py-16">
      <div className="relative">
        <div className="pointer-events-none absolute -right-24 -top-20 hidden h-[420px] w-[420px] rounded-full border border-primary/10 lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-8 top-0 hidden h-[280px] w-[280px] rounded-full border border-primary/10 lg:block" aria-hidden="true" />

        <div className="relative max-w-3xl">
          <h1 className="h1">Buscar proyectos</h1>
          <p className="body mt-3">
            Busca por nombre, reto o ubicación entre los proyectos registrados en NASA Space Apps.
          </p>
        </div>

        <form onSubmit={onSubmit} className="relative mt-8 max-w-3xl" role="search">
          <label htmlFor="home-search" className="sr-only">Buscar proyectos</label>
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="home-search"
              className="search-input"
              placeholder="Busca “exoplanetas”, “Brasil” o el nombre de un proyecto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary shrink-0">Buscar</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="meta mr-1">Prueba con</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                className="chip"
                onClick={() => goToExplore(example.params)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </form>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button onClick={() => goToExplore({})} className="text-sm text-action underline underline-offset-4 hover:text-primary">
            Explorar todo el archivo
          </button>
          <button onClick={() => goToExplore({ premio: "ganador" })} className="text-sm text-secondary underline underline-offset-4 hover:text-primary">
            Ver ganadores de {year}
          </button>
          <Link to={`/reporte?year=${year}`} className="text-sm text-secondary underline underline-offset-4 hover:text-primary">
            Leer el reporte
          </Link>
        </div>
      </div>

      <section aria-labelledby="panorama" className="mt-16 border-t border-subtle pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="panorama" className="h2">El evento en un vistazo</h2>
            <p className="meta mt-2">Cifras de la edición {year}. Cada dato enlaza al reporte completo.</p>
          </div>
          <Link to={`/reporte?year=${year}`} className="text-sm text-action underline underline-offset-4 hover:text-primary">
            Ver reporte de {year}
          </Link>
        </div>

        <div className="mt-5 grid gap-px bg-subtle sm:grid-cols-3">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="kpi group">
              <span className="label block">{stat.label}</span>
              <span className="mono mt-2 block text-4xl text-primary group-hover:text-action">
                {stat.value == null ? "—" : stat.value.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>

        {report?.findings[0] && (
          <Link to={`/reporte?year=${year}#participacion`} className="panel mt-4 block p-5 hover:border-control">
            <span className="label text-secondary">Hallazgo principal</span>
            <p className="h3 mt-2 max-w-3xl">{report.findings[0]}</p>
          </Link>
        )}
      </section>

      <section aria-labelledby="destacados" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="destacados" className="h2">Ganadores destacados</h2>
            <p className="meta mt-2">Tres proyectos premiados de la edición {year}.</p>
          </div>
          <button onClick={() => goToExplore({ premio: "ganador" })} className="text-sm text-action underline underline-offset-4 hover:text-primary">
            Ver todos los ganadores
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(report?.winners ?? []).slice(0, 3).map((winner) => (
            <a
              key={winner.link}
              href={`https://www.spaceappschallenge.org${winner.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card min-h-0"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="meta">{winner.country}</span>
                <span className="award award-winner"><span aria-hidden="true">★</span> Ganador</span>
              </div>
              <span className="card-title">{winner.name}</span>
              <span className="card-link mt-auto">Ver proyecto <span aria-hidden="true">↗</span></span>
            </a>
          ))}
          {!report && <p className="meta">Cargando ganadores…</p>}
          {report && report.winners.length === 0 && (
            <p className="meta">No hay ganadores globales registrados para {year}.</p>
          )}
        </div>
      </section>
    </div>
  );
}

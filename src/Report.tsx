import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useYear } from "./year";
import type { DataItem, FunnelStep, StatsReport } from "../server/lib/statsData";

type ChartProps = {
  title: string;
  subtitle: string;
  data: DataItem[];
  suffix?: string;
  onSelect?: (item: DataItem) => void;
  tableLabel?: string;
};

function Chart({ title, subtitle, data, suffix = "", onSelect, tableLabel = "Ver como tabla" }: ChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="chart-shell">
      <h3 className="chart-title">{title}</h3>
      <p className="chart-sub">{subtitle}</p>
      <div className="mt-4" role="group" aria-label={`${title}. ${subtitle}`}>
        {data.length === 0 ? (
          <p className="meta py-4">Sin datos suficientes para este año.</p>
        ) : (
          data.map((item, index) => {
            const content = (
              <>
                <span className="bar-label">{item.label}</span>
                <span className="bar-value">{item.value.toLocaleString()}{suffix}</span>
                <span className="bar-meta">
                  <span className="bar-track" aria-hidden="true">
                    <span className="bar-fill" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
                  </span>
                  {item.n != null && <span className="bar-n">n = {item.n.toLocaleString()}</span>}
                </span>
              </>
            );

            return onSelect ? (
              <button
                key={item.label}
                type="button"
                className="bar-row"
                data-highlight={index === 0}
                onClick={() => onSelect(item)}
                aria-label={`${item.label}: ${item.value}${suffix}${item.n != null ? `, n = ${item.n}` : ""}. Ver proyectos.`}
              >
                {content}
              </button>
            ) : (
              <div key={item.label} className="bar-row" data-highlight={index === 0}>
                {content}
              </div>
            );
          })
        )}
      </div>

      {data.length > 0 && (
        <details className="mt-4">
          <summary className="meta cursor-pointer select-none hover:text-primary">{tableLabel}</summary>
          <div className="mt-2 overflow-x-auto thin-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">n</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td className="num">{item.value.toLocaleString()}{suffix}</td>
                    <td className="num">{item.n != null ? item.n.toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function Funnel({ steps, onSelect }: { steps: FunnelStep[]; onSelect: (step: FunnelStep) => void }) {
  const max = Math.max(...steps.map((step) => step.value), 1);
  return (
    <div className="chart-shell" role="group" aria-label="De todos los proyectos a los ganadores globales. Selectividad del evento.">
      <h3 className="chart-title">De todos los proyectos a los ganadores globales</h3>
      <p className="chart-sub">Selectividad del evento. Cada paso muestra el porcentaje sobre el total y la conversión desde el paso anterior.</p>
      <div className="mt-5 space-y-1">
        {steps.map((step, index) => (
          <button
            key={step.label}
            type="button"
            className="w-full border-b border-subtle py-3 text-left last:border-0 hover:bg-raised"
            onClick={() => onSelect(step)}
            aria-label={`${step.label}: ${step.value.toLocaleString()}, ${step.shareOfTotal}% del total. Ver en el archivo.`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
              <span className="text-sm text-secondary">{step.label}</span>
              <span className="bar-value">{step.value.toLocaleString()}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 px-1">
              <div className="bar-track flex-1" aria-hidden="true">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(1, (step.value / max) * 100)}%`,
                    background: index === steps.length - 1 ? "var(--award)" : "var(--context)",
                  }}
                />
              </div>
              <span className="bar-n">{step.shareOfTotal}% del total</span>
            </div>
            {step.conversion != null && index > 0 && (
              <p className="meta mt-1.5 px-1">{step.conversion}% convierte desde el paso anterior.</p>
            )}
          </button>
        ))}
      </div>
      <details className="mt-4">
        <summary className="meta cursor-pointer select-none hover:text-primary">Ver como tabla</summary>
        <div className="mt-2 overflow-x-auto thin-scrollbar">
          <table className="table">
            <thead>
              <tr><th>Paso</th><th className="text-right">Proyectos</th><th className="text-right">% del total</th><th className="text-right">Conversión</th></tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.label}>
                  <td>{step.label}</td>
                  <td className="num">{step.value.toLocaleString()}</td>
                  <td className="num">{step.shareOfTotal}%</td>
                  <td className="num">{step.conversion != null ? `${step.conversion}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

const SECTIONS = [
  { id: "participacion", label: "Participación" },
  { id: "competencia", label: "Competencia" },
  { id: "premios", label: "Premios" },
  { id: "geografia", label: "Geografía" },
  { id: "analisis", label: "Análisis exploratorio" },
];

const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

function ReportNav({ active }: { active: string }) {
  return (
    <nav className="report-nav" aria-label="Secciones del reporte">
      {SECTIONS.map((section) => (
        <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "true" : undefined}>
          {section.label}
        </a>
      ))}
    </nav>
  );
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value == null) return null;
  const className = value > 0 ? "delta-up" : value < 0 ? "delta-down" : "delta-flat";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-xs ${className}`} aria-label={`${label}: ${sign}${value}`}>
      {value > 0 ? "↑" : value < 0 ? "↓" : "→"} {sign}{value.toLocaleString()}
    </span>
  );
}

function Kpi({
  label,
  value,
  delta,
  to,
  children,
}: {
  label: string;
  value: number;
  delta: number | null;
  to: string;
  children?: ReactNode;
}) {
  return (
    <Link to={to} className="kpi group">
      <span className="label block">{label}</span>
      <span className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="mono text-3xl text-primary group-hover:text-action">{value.toLocaleString()}</span>
        <Delta value={delta} label={label} />
      </span>
      {children}
    </Link>
  );
}

export function Report() {
  const year = useYear();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<StatsReport | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState("participacion");

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(false);
    fetch(`/api/stats?year=${year}`)
      .then((response) => {
        if (!response.ok) throw new Error("stats");
        return response.json();
      })
      .then((data: StatsReport) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [year]);

  useEffect(() => {
    if (!report || !location.hash) return;
    const target = document.querySelector(location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report, location.hash]);

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActive(visible.target.id);
          window.history.replaceState(null, "", `#${visible.target.id}`);
        }
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [report]);

  const top3 = useMemo(() => report?.challengeData.slice(0, 3) ?? [], [report]);
  const top3Share = report ? pct(top3.reduce((sum, item) => sum + item.value, 0), report.metrics.totalProjects) : 0;
  const topCountry = report?.countryData[0];
  const topRateChallenge = report?.nominationRateData[0];
  const topEfficiency = report?.efficiencyData[0];
  const virtual = report?.virtualVsPhysical[0];
  const physical = report?.virtualVsPhysical[1];
  const winnerCountry = report?.winnersByCountry[0];
  const topRegionPart = report?.regionalParticipation[0];
  const topRegionalRate = report?.regionalSuccessRate[0];
  const topName = report ? [...report.nameComplexityData].sort((a, b) => b.value - a.value)[0] : undefined;
  const topTech = report ? [...report.techKeywordData].sort((a, b) => b.value - a.value)[0] : undefined;
  const topFocus = report ? [...report.projectFocusData].sort((a, b) => b.value - a.value)[0] : undefined;
  const cityCountryTitle = report && report.citiesPerCountry.length >= 2
    ? `${report.citiesPerCountry[0]?.label} y ${report.citiesPerCountry[1]?.label} reúnen la mayor diversidad de ciudades`
    : "Ciudades únicas por país";

  const toExplore = (params: Record<string, string>) => {
    const search = new URLSearchParams({ year: String(year), ...params });
    navigate(`/explorar?${search.toString()}`);
  };

  if (error) {
    return (
      <div className="shell py-16">
        <p className="h2">No se pudo cargar el reporte de {year}.</p>
        <p className="body mt-2">Revisa la conexión e inténtalo de nuevo.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="shell py-16">
        <p className="meta">Cargando reporte de {year}…</p>
      </div>
    );
  }

  return (
    <div className="shell py-8 md:py-10">
      <header className="border-b border-subtle pb-7">
        <p className="label mb-2">Reporte · {year}</p>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="h1">Reporte</h1>
            <p className="body mt-3">
              Qué pasó en {year}: un resumen de participación, competencia y premios construido solo con nombre, ubicación, reto y premios.
            </p>
          </div>
          <a
            href={year === 2024
              ? "https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/"
              : `https://www.spaceappschallenge.org/${year}/find-a-team/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-action underline underline-offset-4 hover:text-primary"
          >
            Archivo oficial de {year} ↗
          </a>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {report.findings.map((finding, index) => (
            <p key={index} className="border-l-2 border-control pl-4 text-sm leading-relaxed text-secondary">
              {finding}
            </p>
          ))}
        </div>
      </header>

      <div className="grid gap-8 pt-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px]">
            <p className="label mb-3">Índice</p>
            <ReportNav active={active} />
          </div>
        </aside>

        <div className="min-w-0">
          <details className="panel sticky top-[72px] z-20 mb-5 p-4 lg:hidden">
            <summary className="label cursor-pointer">Índice del reporte</summary>
            <div className="mt-2"><ReportNav active={active} /></div>
          </details>

          <section aria-label="Indicadores clave" className="grid gap-px bg-subtle sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Proyectos" value={report.metrics.totalProjects} delta={report.deltas.totalProjects} to={`/reporte?year=${year}#participacion`} />
            <Kpi label="Países" value={report.metrics.countries} delta={report.deltas.countries} to={`/reporte?year=${year}#geografia`} />
            <Kpi label="Ubicaciones" value={report.metrics.localEvents} delta={report.deltas.localEvents} to={`/reporte?year=${year}#geografia`} />
            <Kpi label="Nominados globales" value={report.metrics.nominees} delta={report.deltas.nominees} to={`/explorar?year=${year}&premio=nominado`} />
            <Kpi label="Ganadores globales" value={report.metrics.winners} delta={report.deltas.winners} to={`/explorar?year=${year}&premio=ganador`} />
          </section>

          <section id="participacion" className="pt-12">
            <div className="mb-4">
              <p className="label text-tertiary">01 · Participación</p>
              <h2 className="h2 mt-1">Quién participó y en qué retos</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Chart
                title={`Tres retos concentran el ${top3Share}% de los proyectos`}
                subtitle={`Proyectos por reto. n = ${report.metrics.totalProjects.toLocaleString()}.`}
                data={report.challengeData}
                onSelect={(item) => toExplore({ reto: item.label })}
              />
              <Chart
                title={topCountry ? `${topCountry.label} lidera la participación con ${topCountry.value.toLocaleString()} proyectos` : "Participación por país"}
                subtitle={`Proyectos por país. n = ${report.metrics.totalProjects.toLocaleString()}.`}
                data={report.countryData}
                onSelect={(item) => toExplore({ pais: item.label })}
              />
              <Chart
                title="Ciudades con más equipos registrados"
                subtitle="Excluye eventos virtuales. n = total de proyectos."
                data={report.cityData}
                onSelect={(item) => toExplore({ ciudad: item.label })}
              />
            </div>
          </section>

          <section id="competencia" className="pt-12">
            <div className="mb-4">
              <p className="label text-tertiary">02 · Competencia</p>
              <h2 className="h2 mt-1">Dónde hubo más competencia</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Chart
                title={topRateChallenge ? `${topRateChallenge.label.split(":")[0]} registra la mayor tasa de nominación: ${topRateChallenge.value}%` : "Tasa de nominación por reto"}
                subtitle="Tasa de nominación = nominados / proyectos. Solo retos con n ≥ 100."
                data={report.nominationRateData}
                suffix="%"
                onSelect={(item) => toExplore({ reto: item.label })}
              />
              <Chart
                title={topEfficiency ? `${topEfficiency.label} encabeza la eficiencia con ${topEfficiency.value}%` : "Eficiencia por país"}
                subtitle="Eficiencia = nominados / proyectos. Solo países con n ≥ 30; interpreta diferencias pequeñas con cautela."
                data={report.efficiencyData}
                suffix="%"
                onSelect={(item) => toExplore({ pais: item.label })}
              />
            </div>
          </section>

          <section id="premios" className="pt-12">
            <div className="mb-4">
              <p className="label text-tertiary">03 · Premios</p>
              <h2 className="h2 mt-1">La selectividad del evento</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Funnel
                steps={report.funnel}
                onSelect={(step) => {
                  const award = step.label.includes("Ganadores") ? "ganador"
                    : step.label.includes("Finalistas") ? "finalista"
                    : step.label.includes("Nominados") ? "nominado"
                    : undefined;
                  toExplore(award ? { premio: award } : {});
                }}
              />
              <div className="chart-shell">
                <h3 className="chart-title">Países con más ganadores globales</h3>
                <p className="chart-sub">
                  {winnerCountry
                    ? `${winnerCountry.label} concentra ${winnerCountry.value} de los ${report.metrics.winners} ganadores globales.`
                    : "Sin ganadores registrados."}
                </p>
                <div className="mt-4 overflow-x-auto thin-scrollbar">
                  <table className="table">
                    <thead>
                      <tr><th>País</th><th className="text-right">Ganadores</th></tr>
                    </thead>
                    <tbody>
                      {report.winnersByCountry.map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td className="num">{row.value}</td>
                        </tr>
                      ))}
                      {report.winnersByCountry.length === 0 && (
                        <tr><td colSpan={2}>Sin datos.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="chart-shell mt-4">
              <h3 className="chart-title">Premios locales frente a globales</h3>
              <p className="chart-sub">
                Qué tan difícil es pasar de ganar en un evento local a llegar al juicio global.
                Se considera premio local el <em>People&apos;s Choice</em>, el único premio local registrado en el archivo.
              </p>

              {!report.localGlobal.hasLocalData ? (
                <p className="meta mt-4 border border-subtle bg-base p-4">
                  No hay premios locales registrados en {year}. El archivo solo incluye premios locales <em>People&apos;s Choice</em> para 2024.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-px bg-subtle sm:grid-cols-2 xl:grid-cols-4">
                    <div className="bg-surface p-4">
                      <span className="label block">Premios locales</span>
                      <span className="mono mt-1 block text-2xl text-primary">{report.localGlobal.localAwards.toLocaleString()}</span>
                    </div>
                    <div className="bg-surface p-4">
                      <span className="label block">Llegaron a nominación global</span>
                      <span className="mono mt-1 block text-2xl text-primary">{report.localGlobal.nominees.toLocaleString()}</span>
                      <span className="meta mt-1 block">{report.localGlobal.toNominee}% de los locales</span>
                    </div>
                    <div className="bg-surface p-4">
                      <span className="label block">Llegaron a finalista global</span>
                      <span className="mono mt-1 block text-2xl text-award">{report.localGlobal.finalists.toLocaleString()}</span>
                      <span className="meta mt-1 block">{report.localGlobal.toFinalist}% de los locales</span>
                    </div>
                    <div className="bg-surface p-4">
                      <span className="label block">Ganadores globales</span>
                      <span className="mono mt-1 block text-2xl text-primary">{report.localGlobal.winners.toLocaleString()}</span>
                      <span className="meta mt-1 block">desde un premio local</span>
                    </div>
                  </div>

                  <div className="mt-4 max-h-96 overflow-auto thin-scrollbar">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>País</th>
                          <th className="text-right">Locales</th>
                          <th className="text-right">Nominados</th>
                          <th className="text-right">Finalistas</th>
                          <th className="text-right">Local → finalista</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.localGlobal.byCountry.map((row) => (
                          <tr key={row.country}>
                            <td>
                              {row.country === "Sin país" ? row.country : (
                                <Link
                                  to={`/explorar?year=${year}&pais=${encodeURIComponent(row.country)}`}
                                  className="text-secondary underline underline-offset-4 hover:text-primary"
                                >
                                  {row.country}
                                </Link>
                              )}
                            </td>
                            <td className="num">{row.local}</td>
                            <td className="num">{row.nominees}</td>
                            <td className="num">{row.finalists}</td>
                            <td className="num">{row.toFinalist}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="meta mt-3">
                    La conversión se calcula sobre proyectos con premio local. Los denominadores pequeños por país hacen que un solo caso cambie mucho el porcentaje.
                  </p>
                </>
              )}
            </div>
          </section>

          <section id="geografia" className="pt-12">
            <div className="mb-4">
              <p className="label text-tertiary">04 · Geografía</p>
              <h2 className="h2 mt-1">Dónde se concentró la participación</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Chart
                title={cityCountryTitle}
                subtitle="Ciudades únicas por país. n = países con al menos una ciudad."
                data={report.citiesPerCountry}
                onSelect={(item) => toExplore({ pais: item.label })}
              />
              <Chart
                title={virtual && physical ? `Virtual ${virtual.value}% vs. presencial ${physical.value}%` : "Virtual vs. presencial"}
                subtitle="Tasa de nominación. n = proyectos virtuales y presenciales. Una diferencia pequeña no implica ventaja."
                data={report.virtualVsPhysical}
                suffix="%"
              />
              <Chart
                title={topRegionPart ? `${topRegionPart.label} concentra ${topRegionPart.value.toLocaleString()} proyectos` : "Participación por región"}
                subtitle="Proyectos agrupados por región. n = total de proyectos. La asignación de países a regiones es aproximada."
                data={report.regionalParticipation}
              />
              <Chart
                title={topRegionalRate ? `${topRegionalRate.label} lidera la eficiencia regional con ${topRegionalRate.value}%` : "Eficiencia regional"}
                subtitle="Nominados / proyectos por región. Solo regiones con n ≥ 30."
                data={report.regionalSuccessRate}
                suffix="%"
              />
            </div>
          </section>

          <section id="analisis" className="pt-12">
            <div className="mb-4">
              <p className="label text-tertiary">05 · Análisis exploratorio</p>
              <h2 className="h2 mt-1">Correlaciones, no una receta</h2>
            </div>
            <div className="panel mb-4 p-5">
              <p className="body">
                Estas comparaciones son <strong className="text-primary">correlacionales y no causales</strong>.
                No controlan por reto, país ni tamaño de grupo, y no deben leerse como una fórmula para ganar.
                Cada gráfica muestra el tamaño de su grupo (n).
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Chart
                title={topName ? `Los nombres de ${topName.label} alcanzan ${topName.value}% de nominación` : "Tasa de nominación por longitud del nombre"}
                subtitle="Tasa de nominación por longitud del nombre. n = proyectos en cada grupo."
                data={report.nameComplexityData}
                suffix="%"
              />
              <Chart
                title={topTech ? `${topTech.label} alcanza ${topTech.value}% de nominación` : "Tasa de nominación por tecnología"}
                subtitle="Tasa de nominación según presencia de palabras como AI, robot o neural. n = proyectos en cada grupo; correlación, no causalidad."
                data={report.techKeywordData}
                suffix="%"
              />
              <Chart
                title={topFocus ? `El foco ${topFocus.label} alcanza ${topFocus.value}% de nominación` : "Tasa de nominación por tema"}
                subtitle="Tasa de nominación por tema inferido del nombre. Inferencia aproximada; n = proyectos en cada grupo."
                data={report.projectFocusData}
                suffix="%"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

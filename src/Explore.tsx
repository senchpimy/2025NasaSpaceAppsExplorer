import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useYear } from "./year";
import { BadgeTags } from "./BadgeTags";
import type { AwardLevel, CountryFacet, Facets, ProjectResult, SortKey } from "../server/lib/query";

const PAGE_SIZE = 24;
const AWARDS: Array<{ value: AwardLevel; label: string }> = [
  { value: "ganador", label: "Ganador" },
  { value: "finalista", label: "Finalista" },
  { value: "nominado", label: "Nominado" },
];
const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "relevancia", label: "Relevancia" },
  { value: "premio", label: "Premio" },
  { value: "nombre", label: "Nombre A–Z" },
  { value: "pais", label: "País" },
];

const FILTER_KIND: Record<string, string> = {
  q: "Búsqueda",
  reto: "Reto",
  lugar: "Lugar",
  premio: "Premio",
};

function listParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key);
}

function mergeProjects(pages: Array<{ items: ProjectResult[] }>): ProjectResult[] {
  const seen = new Set<number>();
  const merged: ProjectResult[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length >= 2);
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        terms.some((term) => part.toLowerCase() === term.toLowerCase())
          ? <mark key={index} className="bg-control/25 text-primary">{part}</mark>
          : <span key={index}>{part}</span>
      )}
    </>
  );
}

function useFacetPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

function ChallengeFilter({
  options,
  selected,
  onChange,
}: {
  options: Facets["challenges"];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const { open, setOpen, ref } = useFacetPopover();
  const [search, setSearch] = useState("");
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <div className="relative" ref={ref}>
      <span className="field-label mb-1 block">Reto</span>
      <button
        type="button"
        className="select text-left"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {selected.length === 0 ? "Todos los retos" : `${selected.length} reto${selected.length > 1 ? "s" : ""} seleccionado${selected.length > 1 ? "s" : ""}`}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Filtrar por reto">
          <div className="border-b border-control p-2">
            <input
              className="w-full border border-subtle bg-base px-3 py-2 text-sm text-primary outline-none focus:border-action"
              placeholder="Buscar reto…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto thin-scrollbar">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className="option"
                data-selected={selected.includes(option.value)}
                onClick={() => toggle(option.value)}
              >
                <span className="flex items-start gap-2">
                  <span className="option-mark text-control" aria-hidden="true">
                    {selected.includes(option.value) ? "✓" : "○"}
                  </span>
                  <span>{option.label}</span>
                </span>
                <span className="filter-count">{option.count.toLocaleString()}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="meta p-3">Sin coincidencias.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationFilter({
  countries,
  selectedCountries,
  selectedCities,
  onChange,
}: {
  countries: CountryFacet[];
  selectedCountries: string[];
  selectedCities: string[];
  onChange: (countries: string[], cities: string[]) => void;
}) {
  const { open, setOpen, ref } = useFacetPopover();
  const [search, setSearch] = useState("");

  const toggleCountry = (value: string) => {
    onChange(
      selectedCountries.includes(value)
        ? selectedCountries.filter((item) => item !== value)
        : [...selectedCountries, value],
      selectedCities.filter((city) => !countries.find((country) => country.value === value)?.cities.some((item) => item.value === city)),
    );
  };

  const toggleCity = (value: string) => {
    onChange(
      selectedCountries,
      selectedCities.includes(value)
        ? selectedCities.filter((item) => item !== value)
        : [...selectedCities, value],
    );
  };

  const query = search.trim().toLowerCase();
  const visible = countries
    .map((country) => ({
      ...country,
      cities: country.cities.filter((city) => !query || city.label.toLowerCase().includes(query)),
      visible: !query || country.label.toLowerCase().includes(query) || country.cities.some((city) => city.label.toLowerCase().includes(query)),
    }))
    .filter((country) => country.visible || selectedCountries.includes(country.value));

  const totalSelected = selectedCountries.length + selectedCities.length;

  return (
    <div className="relative" ref={ref}>
      <span className="field-label mb-1 block">Ubicación</span>
      <button
        type="button"
        className="select text-left"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        {totalSelected === 0 ? "Todos los lugares" : `${totalSelected} lugar${totalSelected > 1 ? "es" : ""} seleccionado${totalSelected > 1 ? "s" : ""}`}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Filtrar por ubicación">
          <div className="border-b border-control p-2">
            <input
              className="w-full border border-subtle bg-base px-3 py-2 text-sm text-primary outline-none focus:border-action"
              placeholder="Buscar país o ciudad…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto thin-scrollbar">
            {visible.map((country) => (
              <div key={country.value}>
                <button
                  type="button"
                  className="option bg-raised/40"
                  data-selected={selectedCountries.includes(country.value)}
                  onClick={() => toggleCountry(country.value)}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="option-mark text-control" aria-hidden="true">
                      {selectedCountries.includes(country.value) ? "✓" : "○"}
                    </span>
                    {country.label}
                  </span>
                  <span className="filter-count">{country.count.toLocaleString()}</span>
                </button>
                {country.cities.map((city) => (
                  <button
                    key={city.value}
                    type="button"
                    className="option pl-8"
                    data-selected={selectedCities.includes(city.value)}
                    onClick={() => toggleCity(city.value)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="option-mark text-control" aria-hidden="true">
                        {selectedCities.includes(city.value) ? "✓" : "○"}
                      </span>
                      {city.label}
                    </span>
                    <span className="filter-count">{city.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            ))}
            {visible.length === 0 && <p className="meta p-3">Sin coincidencias.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function FiltersPanel({
  facets,
  selectedChallenges,
  selectedCountries,
  selectedCities,
  awards,
  sort,
  onChallenges,
  onLocations,
  onAwards,
  onSort,
}: {
  facets: Facets | null;
  selectedChallenges: string[];
  selectedCountries: string[];
  selectedCities: string[];
  awards: AwardLevel[];
  sort: SortKey;
  onChallenges: (values: string[]) => void;
  onLocations: (countries: string[], cities: string[]) => void;
  onAwards: (values: AwardLevel[]) => void;
  onSort: (value: SortKey) => void;
}) {
  const toggleAward = (value: AwardLevel) => {
    onAwards(awards.includes(value) ? awards.filter((item) => item !== value) : [...awards, value]);
  };

  return (
    <div className="grid gap-4">
      <ChallengeFilter options={facets?.challenges ?? []} selected={selectedChallenges} onChange={onChallenges} />
      <LocationFilter
        countries={facets?.countries ?? []}
        selectedCountries={selectedCountries}
        selectedCities={selectedCities}
        onChange={onLocations}
      />

      <div>
        <span className="field-label mb-1 block">Premio</span>
        <div className="segmented" role="group" aria-label="Filtrar por premio">
          <button
            type="button"
            className="segment"
            aria-pressed={awards.length === 0}
            onClick={() => onAwards([])}
          >
            Todos
            <small>{facets?.awards.todos?.toLocaleString() ?? "—"}</small>
          </button>
          {AWARDS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="segment"
              aria-pressed={awards.includes(option.value)}
              onClick={() => toggleAward(option.value)}
            >
              {option.label}
              <small>{facets?.awards[option.value]?.toLocaleString() ?? "—"}</small>
            </button>
          ))}
        </div>
        <p className="meta mt-1.5">Puedes combinar varios niveles de premio.</p>
      </div>

      <label className="field">
        <span className="field-label">Ordenar por</span>
        <select className="select" value={sort} onChange={(event) => onSort(event.target.value as SortKey)}>
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function Explore() {
  const year = useYear();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<ProjectResult[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [error, setError] = useState(false);
  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const initializingRef = useRef(false);
  const loadedPagesRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const q = searchParams.get("q") ?? "";
  const retos = listParam(searchParams, "reto");
  const paises = listParam(searchParams, "pais");
  const ciudades = listParam(searchParams, "ciudad");
  const premios = listParam(searchParams, "premio").filter(
    (value): value is AwardLevel => value === "ganador" || value === "finalista" || value === "nominado",
  );
  const orden = (["premio", "nombre", "pais"].includes(searchParams.get("orden") ?? "")
    ? searchParams.get("orden")
    : "relevancia") as SortKey;
  const pagina = Math.max(1, Number(searchParams.get("pagina")) || 1);
  const isWinners = premios.length === 1 && premios[0] === "ganador";

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    if (qInput === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (qInput.trim()) next.set("q", qInput.trim());
      else next.delete("q");
      next.delete("pagina");
      setSearchParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [qInput, q, searchParams, setSearchParams]);

  const apiBaseQuery = useMemo(() => {
    const params = new URLSearchParams({ year: String(year), limit: String(PAGE_SIZE) });
    if (q) params.set("q", q);
    for (const item of retos) params.append("reto", item);
    for (const item of paises) params.append("pais", item);
    for (const item of ciudades) params.append("ciudad", item);
    for (const item of premios) params.append("premio", item);
    if (orden !== "relevancia") params.set("orden", orden);
    return params.toString();
  }, [year, q, retos, paises, ciudades, premios, orden]);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    initializingRef.current = true;
    loadingMoreRef.current = false;
    loadedPagesRef.current = 0;
    setLoading(true);
    setLoadingMore(false);
    setLoadedPages(0);
    setError(false);
    setResults([]);
    setTotal(0);

    const load = async () => {
      const [firstResponse, facetResponse] = await Promise.all([
        fetch(`/api/search?${apiBaseQuery}&pagina=1`, { signal: controller.signal }),
        fetch(`/api/facets?${apiBaseQuery}`, { signal: controller.signal }),
      ]);
      if (!firstResponse.ok || !facetResponse.ok) throw new Error("fetch");
      const first = await firstResponse.json();
      const facetData = await facetResponse.json();

      const pagesToLoad = Math.min(Math.max(1, pagina), first.totalPages || 1);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, pagesToLoad - 1) }, (_, index) => index + 2)
          .map(async (pageNumber) => {
            const response = await fetch(`/api/search?${apiBaseQuery}&pagina=${pageNumber}`, { signal: controller.signal });
            if (!response.ok) throw new Error("fetch");
            return response.json();
          }),
      );

      if (controller.signal.aborted) return;
      setResults(mergeProjects([first, ...rest]));
      setTotal(first.total);
      setTotalPages(first.totalPages || 1);
      setFacets(facetData);
      loadedPagesRef.current = pagesToLoad;
      setLoadedPages(pagesToLoad);
    };

    load()
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          initializingRef.current = false;
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [apiBaseQuery]);

  useEffect(() => {
    if (initializingRef.current || pagina <= loadedPagesRef.current) return;
    const controller = new AbortController();
    loadingMoreRef.current = true;
    setLoadingMore(true);

    fetch(`/api/search?${apiBaseQuery}&pagina=${pagina}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("fetch");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResults((previous) => mergeProjects([{ items: previous }, data]));
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        loadedPagesRef.current = pagina;
        setLoadedPages(pagina);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      });

    return () => controller.abort();
  }, [pagina, apiBaseQuery]);

  const goToPage = (page: number) => {
    if (initializingRef.current || loadingMoreRef.current || page <= loadedPagesRef.current) return;
    loadingMoreRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.set("pagina", String(page));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !initializingRef.current &&
          !loadingMoreRef.current &&
          !error &&
          loadedPagesRef.current < totalPages
        ) {
          goToPage(loadedPagesRef.current + 1);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [totalPages, loadedPages, error, searchParams]);

  const update = (patch: Record<string, string | string[] | undefined>, resetPage = true, replace = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      if (Array.isArray(value)) {
        for (const item of value) next.append(key, item);
      } else if (value) {
        next.set(key, value);
      }
    }
    if (resetPage) next.delete("pagina");
    setSearchParams(next, { replace });
  };

  const clearAll = () => {
    const next = new URLSearchParams({ year: String(year) });
    setSearchParams(next);
  };

  const removeFilter = (key: "reto" | "pais" | "ciudad", value: string) => {
    const current = key === "reto" ? retos : key === "pais" ? paises : ciudades;
    update({ [key]: current.filter((item) => item !== value) });
  };

  const activeChips = [
    ...(q ? [{ key: "q" as const, kind: "q", label: `“${q}”`, value: q }] : []),
    ...retos.map((value) => ({ key: "reto" as const, kind: "reto", label: value, value })),
    ...paises.map((value) => ({ key: "pais" as const, kind: "lugar", label: value, value })),
    ...ciudades.map((value) => ({ key: "ciudad" as const, kind: "lugar", label: value, value })),
    ...premios.map((value) => ({ key: "premio" as const, kind: "premio", label: AWARDS.find((item) => item.value === value)?.label ?? value, value })),
  ];

  const awardCounts = facets?.awards;
  const missingFilters = [
    ...retos.filter((value) => !facets?.challenges.some((item) => item.value === value)),
    ...paises.filter((value) => !facets?.countries.some((item) => item.value === value)),
    ...ciudades.filter((value) => !facets?.countries.some((country) => country.cities.some((item) => item.value === value))),
  ];
  const suggestion = retos.length
    ? "Prueba quitando un filtro de reto."
    : paises.length || ciudades.length
      ? "Prueba quitando un filtro de ubicación."
      : premios.length > 0
        ? "Prueba cambiando el filtro de premio a Todos."
        : q
          ? "Prueba con otra palabra o revisa la ortografía."
          : "Prueba cambiando de año.";

  return (
    <div className="shell py-8 md:py-10">
      <header className="border-b border-subtle pb-6">
        <p className="label mb-2">{isWinners ? "Ganadores" : "Explorar"} · {year}</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="h1">{isWinners ? "Ganadores" : "Explorar"}</h1>
            <p className="body mt-2 max-w-2xl">
              {isWinners
                ? "Proyectos que recibieron el premio global. Puedes combinarlos con un país o un reto."
                : "Busca por nombre, reto o ubicación. Todos los filtros y la página viven en la URL."}
            </p>
          </div>
          <p className="meta" aria-live="polite" aria-atomic="true">
            {loading ? "Buscando…" : `${total.toLocaleString()} resultado${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <form
          role="search"
          className="mt-5 max-w-2xl"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            update({ q: qInput.trim() });
          }}
        >
          <label htmlFor="archive-search" className="sr-only">Buscar en el archivo</label>
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="archive-search"
              className="search-input"
              placeholder="Busca un proyecto, reto o lugar"
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              autoComplete="off"
            />
            {qInput && (
              <button
                type="button"
                className="btn-ghost btn"
                onClick={() => { setQInput(""); update({ q: undefined }); }}
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </header>

      <div className="grid gap-8 pt-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] z-30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="h3">Filtros</h2>
              {activeChips.length > 0 && (
                <button type="button" onClick={clearAll} className="text-sm text-secondary underline underline-offset-4 hover:text-primary">
                  Limpiar todo
                </button>
              )}
            </div>
            <FiltersPanel
              facets={facets}
              selectedChallenges={retos}
              selectedCountries={paises}
              selectedCities={ciudades}
              awards={premios}
              sort={orden}
              onChallenges={(values) => update({ reto: values })}
              onLocations={(nextCountries, nextCities) => update({ pais: nextCountries, ciudad: nextCities })}
              onAwards={(values) => update({ premio: values })}
              onSort={(value) => update({ orden: value === "relevancia" ? undefined : value })}
            />
          </div>
        </aside>

        <section id="resultados" aria-labelledby="resultados-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button type="button" className="btn" onClick={() => setFiltersOpen(true)}>
                Filtros {activeChips.length > 0 ? `(${activeChips.length})` : ""}
              </button>
              {activeChips.length > 0 && (
                <button type="button" onClick={clearAll} className="text-sm text-secondary underline underline-offset-4">
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <h2 id="resultados-title" className="sr-only">Resultados</h2>

          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="label">Filtros activos:</span>
              {activeChips.map((chip) => (
                <span key={`${chip.key}-${chip.value}`} className="chip chip-filter" data-selected="true" data-kind={chip.kind}>
                  <span className="text-xs font-medium text-tertiary">{FILTER_KIND[chip.kind]}</span>
                  <span className="max-w-[16rem] truncate">{chip.label}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Quitar filtro de ${FILTER_KIND[chip.kind]}: ${chip.label}`}
                    onClick={() => {
                      if (chip.key === "q") { setQInput(""); update({ q: undefined }); }
                      else if (chip.key === "premio") update({ premio: premios.filter((value) => value !== chip.value) });
                      else removeFilter(chip.key, chip.value);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading && (
            <div className="panel flex items-center justify-center py-20">
              <span className="meta">Buscando proyectos…</span>
            </div>
          )}

          {!loading && error && (
            <div className="panel p-6">
              <p className="h3 text-negative">No se pudo consultar el archivo.</p>
              <p className="meta mt-2">Revisa la conexión e inténtalo de nuevo.</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="panel p-8">
              <p className="h2">0 resultados con estos filtros.</p>
              <p className="body mt-2">{suggestion}</p>
              {missingFilters.length > 0 && (
                <p className="meta mt-3 text-negative">
                  {missingFilters.join(", ")} no tiene resultados en {year}. Cambia de año o quita ese filtro.
                </p>
              )}
              {activeChips.length > 0 && (
                <button type="button" className="btn btn-primary mt-5" onClick={clearAll}>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((project) => (
                  <a
                    key={project.id}
                    href={`https://www.spaceappschallenge.org${project.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card"
                    aria-label={`${project.name}. Ver proyecto en spaceappschallenge.org`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="meta flex items-start gap-1.5">
                        <span aria-hidden="true">⌖</span>
                        <span className="line-clamp-2">{project.location || "Ubicación no registrada"}</span>
                      </span>
                    </div>

                    <h3 className="card-title" title={project.name}>
                      <Highlight text={project.name} query={q} />
                    </h3>

                    <BadgeTags badges={project.badges} />

                    <p className="card-challenge">
                      <span aria-hidden="true">◈</span>
                      <span className="line-clamp-2">{project.challenge || "Reto no registrado"}</span>
                    </p>

                    <span className="card-link mt-auto">Ver proyecto <span aria-hidden="true">↗</span></span>
                  </a>
                ))}
              </div>

              <div className="mt-6 border-t border-subtle pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="meta">
                    Mostrando {results.length.toLocaleString()} de {total.toLocaleString()} resultados
                  </span>
                  {loadedPages < totalPages ? (
                    <button
                      type="button"
                      className="btn"
                      disabled={loadingMore}
                      onClick={() => goToPage(loadedPages + 1)}
                    >
                      {loadingMore ? "Cargando…" : "Cargar más"}
                    </button>
                  ) : (
                    <span className="meta">Fin del índice · {total.toLocaleString()} registros</span>
                  )}
                </div>

                {loadedPages < totalPages && (
                  <div ref={sentinelRef} className="h-10" aria-hidden="true" />
                )}

                {loadingMore && (
                  <div className="flex items-center justify-center gap-3 py-4" aria-live="polite">
                    <span className="h-4 w-4 animate-spin border border-control border-t-action" aria-hidden="true" />
                    <span className="meta">Cargando más proyectos…</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {filtersOpen && (
        <>
          <div className="sheet-backdrop lg:hidden" onClick={() => setFiltersOpen(false)} />
          <div className="sheet lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="h3">Filtros</h2>
              <button type="button" className="btn-ghost btn" onClick={() => setFiltersOpen(false)}>Cerrar</button>
            </div>
            <FiltersPanel
              facets={facets}
              selectedChallenges={retos}
              selectedCountries={paises}
              selectedCities={ciudades}
              awards={premios}
              sort={orden}
              onChallenges={(values) => update({ reto: values })}
              onLocations={(nextCountries, nextCities) => update({ pais: nextCountries, ciudad: nextCities })}
              onAwards={(values) => update({ premio: values })}
              onSort={(value) => update({ orden: value === "relevancia" ? undefined : value })}
            />
            <button
              type="button"
              className="btn btn-primary mt-5 w-full"
              onClick={() => setFiltersOpen(false)}
            >
              Ver {total.toLocaleString()} resultados
            </button>
          </div>
        </>
      )}

      {/* keep count referenced for accessibility when facets are loading */}
      <span className="sr-only" aria-live="polite">
        {awardCounts ? `${awardCounts.ganador} ganadores, ${awardCounts.finalista} finalistas y ${awardCounts.nominado} nominados.` : ""}
      </span>
    </div>
  );
}

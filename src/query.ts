export type AwardLevel = "ganador" | "finalista" | "nominado";
export type AwardFilter = "todos" | AwardLevel;
export type SortKey = "relevancia" | "premio" | "nombre" | "pais";

export type ExploreFilters = {
  year: number;
  q: string;
  retos: string[];
  paises: string[];
  ciudades: string[];
  premios: AwardLevel[];
  orden: SortKey;
  page: number;
  pageSize: number;
};

export type QueryDb = {
  all<T>(sql: string, ...params: unknown[]): T[];
};

export type ProjectResult = {
  id: number;
  name: string;
  location: string;
  country: string;
  challenge: string;
  badges: string | null;
  link: string;
  award: AwardLevel | null;
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type CountryFacet = FacetOption & {
  cities: FacetOption[];
};

export type Facets = {
  total: number;
  challenges: FacetOption[];
  countries: CountryFacet[];
  awards: Record<AwardFilter, number>;
};

export function normalizeText(value: string): string {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => parseList(item)))];
  }
  const single = String(value ?? "").trim();
  return single ? [single] : [];
}

export function parseFilters(params: {
  year?: unknown;
  q?: unknown;
  reto?: unknown;
  pais?: unknown;
  ciudad?: unknown;
  premio?: unknown;
  orden?: unknown;
  pagina?: unknown;
  limit?: unknown;
}): ExploreFilters {
  const year = Number(params.year);
  const premios = parseList(params.premio).filter(
    (value): value is AwardLevel => value === "ganador" || value === "finalista" || value === "nominado",
  );
  const ordenRaw = String(params.orden ?? "relevancia");
  const orden: SortKey = ["premio", "nombre", "pais"].includes(ordenRaw)
    ? (ordenRaw as SortKey)
    : "relevancia";

  return {
    year: [2023, 2024, 2025].includes(year) ? year : 2025,
    q: String(params.q ?? "").trim(),
    retos: parseList(params.reto),
    paises: parseList(params.pais),
    ciudades: parseList(params.ciudad),
    premios,
    orden,
    page: Math.max(1, Number(params.pagina) || 1),
    pageSize: Math.min(60, Math.max(12, Number(params.limit) || 24)),
  };
}

const AWARD_CASE = (alias: string) => `
  CASE
    WHEN lower(${alias}.badges) LIKE '%winner%' THEN 'ganador'
    WHEN lower(${alias}.badges) LIKE '%finalist%' THEN 'finalista'
    WHEN lower(${alias}.badges) LIKE '%nominee%' THEN 'nominado'
    ELSE NULL
  END
`;

const AWARD_RANK = (alias: string) => `
  CASE
    WHEN lower(${alias}.badges) LIKE '%winner%' THEN 0
    WHEN lower(${alias}.badges) LIKE '%finalist%' THEN 1
    WHEN lower(${alias}.badges) LIKE '%nominee%' THEN 2
    ELSE 3
  END
`;

function awardWhere(level: AwardFilter, alias = "p"): { sql: string; params: unknown[] } {
  const badges = `lower(${alias}.badges)`;
  if (level === "ganador") {
    return { sql: `${badges} LIKE '%winner%'`, params: [] };
  }
  if (level === "finalista") {
    return {
      sql: `${badges} LIKE '%finalist%' AND ${badges} NOT LIKE '%winner%'`,
      params: [],
    };
  }
  if (level === "nominado") {
    return {
      sql: `${badges} LIKE '%nominee%' AND ${badges} NOT LIKE '%finalist%' AND ${badges} NOT LIKE '%winner%'`,
      params: [],
    };
  }
  return { sql: "1=1", params: [] };
}

type Skip = "retos" | "ubicacion" | "premio";

const SEARCH_ALIASES: Record<string, string> = {
  brasil: "brazil",
  espana: "spain",
  alemania: "germany",
  reino: "united",
  unido: "kingdom",
  estados: "united",
  unidos: "states",
  paises: "countries",
};

function searchVariants(token: string): string[] {
  const variants = new Set<string>([token]);
  if (token.length > 4 && /(as|es|os)$/.test(token)) variants.add(token.slice(0, -2));
  if (token.length > 3 && token.endsWith("s")) variants.add(token.slice(0, -1));
  const alias = SEARCH_ALIASES[token];
  if (alias) variants.add(alias);
  return [...variants];
}

function buildWhere(filters: ExploreFilters, skip?: Skip): { sql: string; params: unknown[] } {
  const clauses: string[] = ["p.year = ?"];
  const params: unknown[] = [filters.year];

  for (const token of normalizeText(filters.q).split(/\s+/).filter(Boolean)) {
    const variants = searchVariants(token);
    clauses.push(`(${variants.map(() => "p.search_text LIKE ?").join(" OR ")})`);
    params.push(...variants.map((variant) => `%${variant}%`));
  }

  if (skip !== "retos" && filters.retos.length > 0) {
    clauses.push(`c.title IN (${filters.retos.map(() => "?").join(",")})`);
    params.push(...filters.retos);
  }

  if (skip !== "ubicacion") {
    if (filters.paises.length > 0) {
      clauses.push(`l.country IN (${filters.paises.map(() => "?").join(",")})`);
      params.push(...filters.paises);
    }
    if (filters.ciudades.length > 0) {
      clauses.push(`l.display_name IN (${filters.ciudades.map(() => "?").join(",")})`);
      params.push(...filters.ciudades);
    }
  }

  if (skip !== "premio" && filters.premios.length > 0) {
    const awardClauses = filters.premios.map((level) => `(${awardWhere(level).sql})`);
    clauses.push(`(${awardClauses.join(" OR ")})`);
  }

  return { sql: ` WHERE ${clauses.join(" AND ")}`, params };
}

const JOINS = `
  FROM projects p
  LEFT JOIN locations l ON p.location = l.id
  LEFT JOIN challenges c ON p.challenge = c.id
`;

export function searchProjects(
  db: QueryDb,
  filters: ExploreFilters,
): { items: ProjectResult[]; total: number; page: number; pageSize: number; totalPages: number } {
  const where = buildWhere(filters);
  const totalRow = db.all<{ total: number }>(
    `SELECT COUNT(*) AS total ${JOINS} ${where.sql}`,
    ...where.params,
  )[0];
  const total = totalRow?.total ?? 0;

  const orderParams: unknown[] = [];
  let orderBy = "";
  if (filters.orden === "nombre") {
    orderBy = "p.name COLLATE NOCASE ASC";
  } else if (filters.orden === "pais") {
    orderBy = "COALESCE(l.country, '') COLLATE NOCASE ASC, p.name COLLATE NOCASE ASC";
  } else if (filters.orden === "premio") {
    orderBy = `${AWARD_RANK("p")} ASC, p.name COLLATE NOCASE ASC`;
  } else if (filters.q) {
    orderParams.push(`${normalizeText(filters.q)}%`);
    orderBy = `(CASE WHEN p.search_text LIKE ? THEN 0 ELSE 1 END) ASC, ${AWARD_RANK("p")} ASC, p.name COLLATE NOCASE ASC`;
  } else {
    orderBy = `${AWARD_RANK("p")} ASC, p.name COLLATE NOCASE ASC`;
  }

  const offset = (filters.page - 1) * filters.pageSize;
  const items = db.all<ProjectResult>(
    `
    SELECT p.id, p.name,
           COALESCE(l.display_name, '') AS location,
           COALESCE(l.country, '') AS country,
           COALESCE(c.title, '') AS challenge,
           p.badges, p.link,
           ${AWARD_CASE("p")} AS award
    ${JOINS}
    ${where.sql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
    `,
    ...where.params,
    ...orderParams,
    filters.pageSize,
    offset,
  );

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

function countBy(
  db: QueryDb,
  filters: ExploreFilters,
  skip: Skip,
  select: string,
  groupBy: string,
): Array<{ value: string; label: string; count: number; country?: string }> {
  const where = buildWhere(filters, skip);
  return db.all(
    `
    SELECT ${select}, COUNT(*) AS count
    ${JOINS}
    ${where.sql}
    GROUP BY ${groupBy}
    ORDER BY count DESC, label COLLATE NOCASE ASC
    `,
    ...where.params,
  );
}

export function computeFacets(db: QueryDb, filters: ExploreFilters): Facets {
  const totalRow = db.all<{ total: number }>(
    `SELECT COUNT(*) AS total ${JOINS} ${buildWhere(filters).sql}`,
    ...buildWhere(filters).params,
  )[0];

  const challengeRows = countBy(
    db,
    filters,
    "retos",
    "c.title AS value, c.title AS label",
    "c.title",
  );

  const locationRows = countBy(
    db,
    filters,
    "ubicacion",
    "l.display_name AS value, l.display_name AS label, l.country AS country",
    "l.country, l.display_name",
  );

  const countries = new Map<string, CountryFacet>();
  for (const row of locationRows) {
    if (!row.country) continue;
    const country = countries.get(row.country) ?? {
      value: row.country,
      label: row.country,
      count: 0,
      cities: [],
    };
    country.count += row.count;
    country.cities.push({ value: row.value, label: row.label, count: row.count });
    countries.set(row.country, country);
  }

  const awardWhere = buildWhere(filters, "premio");
  const awardRows = db.all<{ value: string | null; count: number }>(
    `SELECT ${AWARD_CASE("p")} AS value, COUNT(*) AS count ${JOINS} ${awardWhere.sql} GROUP BY value`,
    ...awardWhere.params,
  );

  const awards: Record<AwardFilter, number> = {
    todos: awardRows.reduce((sum, row) => sum + row.count, 0),
    ganador: 0,
    finalista: 0,
    nominado: 0,
  };
  for (const row of awardRows) {
    if (row.value === "ganador" || row.value === "finalista" || row.value === "nominado") {
      awards[row.value] = row.count;
    }
  }

  return {
    total: totalRow?.total ?? 0,
    challenges: challengeRows.map((row) => ({
      value: row.value,
      label: row.label,
      count: row.count,
    })),
    countries: [...countries.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    ),
    awards,
  };
}

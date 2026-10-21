// server/api/search.ts
import Database from "better-sqlite3";
import path from "path";

// server/lib/query.ts
function normalizeText(value) {
  return (value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function parseList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => parseList(item)))];
  }
  const single = String(value ?? "").trim();
  return single ? [single] : [];
}
function parseFilters(params) {
  const year = Number(params.year);
  const premios = parseList(params.premio).filter((value) => value === "ganador" || value === "finalista" || value === "nominado");
  const ordenRaw = String(params.orden ?? "relevancia");
  const orden = ["premio", "nombre", "pais"].includes(ordenRaw) ? ordenRaw : "relevancia";
  return {
    year: [2023, 2024, 2025].includes(year) ? year : 2025,
    q: String(params.q ?? "").trim(),
    retos: parseList(params.reto),
    paises: parseList(params.pais),
    ciudades: parseList(params.ciudad),
    premios,
    orden,
    page: Math.max(1, Number(params.pagina) || 1),
    pageSize: Math.min(60, Math.max(12, Number(params.limit) || 24))
  };
}
var AWARD_CASE = (alias) => `
  CASE
    WHEN lower(${alias}.badges) LIKE '%winner%' THEN 'ganador'
    WHEN lower(${alias}.badges) LIKE '%finalist%' THEN 'finalista'
    WHEN lower(${alias}.badges) LIKE '%nominee%' THEN 'nominado'
    ELSE NULL
  END
`;
var AWARD_RANK = (alias) => `
  CASE
    WHEN lower(${alias}.badges) LIKE '%winner%' THEN 0
    WHEN lower(${alias}.badges) LIKE '%finalist%' THEN 1
    WHEN lower(${alias}.badges) LIKE '%nominee%' THEN 2
    ELSE 3
  END
`;
function awardWhere(level, alias = "p") {
  const badges = `lower(${alias}.badges)`;
  if (level === "ganador") {
    return { sql: `${badges} LIKE '%winner%'`, params: [] };
  }
  if (level === "finalista") {
    return {
      sql: `${badges} LIKE '%finalist%' AND ${badges} NOT LIKE '%winner%'`,
      params: []
    };
  }
  if (level === "nominado") {
    return {
      sql: `${badges} LIKE '%nominee%' AND ${badges} NOT LIKE '%finalist%' AND ${badges} NOT LIKE '%winner%'`,
      params: []
    };
  }
  return { sql: "1=1", params: [] };
}
var SEARCH_ALIASES = {
  brasil: "brazil",
  espana: "spain",
  alemania: "germany",
  reino: "united",
  unido: "kingdom",
  estados: "united",
  unidos: "states",
  paises: "countries"
};
function searchVariants(token) {
  const variants = new Set([token]);
  if (token.length > 4 && /(as|es|os)$/.test(token))
    variants.add(token.slice(0, -2));
  if (token.length > 3 && token.endsWith("s"))
    variants.add(token.slice(0, -1));
  const alias = SEARCH_ALIASES[token];
  if (alias)
    variants.add(alias);
  return [...variants];
}
function buildWhere(filters, skip) {
  const clauses = ["p.year = ?"];
  const params = [filters.year];
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
var JOINS = `
  FROM projects p
  LEFT JOIN locations l ON p.location = l.id
  LEFT JOIN challenges c ON p.challenge = c.id
`;
function searchProjects(db, filters) {
  const where = buildWhere(filters);
  const totalRow = db.all(`SELECT COUNT(*) AS total ${JOINS} ${where.sql}`, ...where.params)[0];
  const total = totalRow?.total ?? 0;
  const orderParams = [];
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
  const items = db.all(`
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
    `, ...where.params, ...orderParams, filters.pageSize, offset);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
  };
}
function countBy(db, filters, skip, select, groupBy) {
  const where = buildWhere(filters, skip);
  return db.all(`
    SELECT ${select}, COUNT(*) AS count
    ${JOINS}
    ${where.sql}
    GROUP BY ${groupBy}
    ORDER BY count DESC, label COLLATE NOCASE ASC
    `, ...where.params);
}
function computeFacets(db, filters) {
  const totalRow = db.all(`SELECT COUNT(*) AS total ${JOINS} ${buildWhere(filters).sql}`, ...buildWhere(filters).params)[0];
  const challengeRows = countBy(db, filters, "retos", "c.title AS value, c.title AS label", "c.title");
  const locationRows = countBy(db, filters, "ubicacion", "l.display_name AS value, l.display_name AS label, l.country AS country", "l.country, l.display_name");
  const countries = new Map;
  for (const row of locationRows) {
    if (!row.country)
      continue;
    const country = countries.get(row.country) ?? {
      value: row.country,
      label: row.country,
      count: 0,
      cities: []
    };
    country.count += row.count;
    country.cities.push({ value: row.value, label: row.label, count: row.count });
    countries.set(row.country, country);
  }
  const awardWhere2 = buildWhere(filters, "premio");
  const awardRows = db.all(`SELECT ${AWARD_CASE("p")} AS value, COUNT(*) AS count ${JOINS} ${awardWhere2.sql} GROUP BY value`, ...awardWhere2.params);
  const awards = {
    todos: awardRows.reduce((sum, row) => sum + row.count, 0),
    ganador: 0,
    finalista: 0,
    nominado: 0
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
      count: row.count
    })),
    countries: [...countries.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    awards
  };
}

// server/api/search.ts
var dbPath = path.join(process.cwd(), "nasa_projects_2025.db");
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const db = new Database(dbPath, { readonly: true });
  try {
    const queryDb = {
      all(sql, ...params) {
        return db.prepare(sql).all(...params);
      }
    };
    const input = req.method === "GET" ? req.query : req.body;
    const filters = parseFilters(input);
    return res.status(200).json(searchProjects(queryDb, filters));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}
export {
  handler as default
};

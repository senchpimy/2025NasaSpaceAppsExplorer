import { serve } from "bun";
import index from "./index.html";
import { Database } from "bun:sqlite";
import { computeStats, type StatsDb } from "../api/_lib/statsData";
import { computeFacets, parseFilters, searchProjects, type QueryDb } from "../api/_lib/query";

const db = new Database("nasa_projects_2025.db", { readonly: true });

const statsDb: StatsDb = {
  all<T>(sql: string, ...params: unknown[]): T[] {
    return db.query(sql).all(...(params as any[])) as T[];
  },
};

const queryDb: QueryDb = statsDb;

function filtersFromUrl(url: URL) {
  const get = (key: string) => url.searchParams.get(key);
  const getAll = (key: string) => url.searchParams.getAll(key);
  return parseFilters({
    year: get("year"),
    q: get("q"),
    reto: getAll("reto"),
    pais: getAll("pais"),
    ciudad: getAll("ciudad"),
    premio: getAll("premio"),
    orden: get("orden"),
    pagina: get("pagina"),
    limit: get("limit"),
  });
}

const server = serve({
  routes: {
    "/api/search": {
      async GET(req) {
        const filters = filtersFromUrl(new URL(req.url));
        return Response.json(searchProjects(queryDb, filters));
      },
      async POST(req) {
        const body = await req.json() as Record<string, unknown>;
        const filters = parseFilters(body);
        return Response.json(searchProjects(queryDb, filters));
      },
    },

    "/api/facets": {
      async GET(req) {
        const filters = filtersFromUrl(new URL(req.url));
        return Response.json(computeFacets(queryDb, filters));
      },
    },

    "/api/stats": {
      async GET(req) {
        const filters = filtersFromUrl(new URL(req.url));
        return Response.json(computeStats(statsDb, filters.year));
      },
    },

    "/api/categorias/:cat": {
      async GET(req) {
        const categoria = req.params.cat;
        const year = filtersFromUrl(new URL(req.url)).year;
        if (categoria === "challenges") {
          const results = db.query(`
            SELECT DISTINCT c.title FROM challenges c
            JOIN projects p ON p.challenge = c.id
            WHERE p.year = ? AND c.title IS NOT NULL ORDER BY c.title
          `).all(year) as { title: string }[];
          return Response.json({ cont: results.map((r) => r.title) });
        }
        if (categoria === "locations") {
          const results = db.query(`
            SELECT DISTINCT l.display_name FROM locations l
            JOIN projects p ON p.location = l.id
            WHERE p.year = ? AND l.display_name IS NOT NULL ORDER BY l.display_name
          `).all(year) as { display_name: string }[];
          return Response.json({ cont: results.map((r) => r.display_name) });
        }
        if (categoria === "projects") {
          const results = db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
          return Response.json({ cont: results.map((r) => r.name) });
        }
        return Response.json({ cont: [] });
      },
    },

    // Catch-all for React routing
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

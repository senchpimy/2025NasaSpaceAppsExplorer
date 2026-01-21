import { serve } from "bun";
import index from "./index.html";
import { Database } from "bun:sqlite";

const db = new Database("nasa_projects_2025.db", { readonly: true })
//const query = db.query("select * from challenges;")
const tablas = db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
console.log(tablas)

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
};

type Project = {
  id: number,
  name: string,
  location: string,
  challenge: string,
  badges?: string | null,
  link: string
}

const server = serve({
  routes: {
    "/api/categorias/:cat": {
      async GET(req) {
        const categoria = req.params.cat;
        if (categoria === "challenges") {
          const results = db.query("SELECT DISTINCT title FROM challenges WHERE title IS NOT NULL ORDER BY title").all() as { title: string }[];
          return Response.json({ cont: results.map(r => r.title) });
        } else if (categoria === "locations") {
          const results = db.query("SELECT DISTINCT display_name FROM locations WHERE display_name IS NOT NULL ORDER BY display_name").all() as { display_name: string }[];
          return Response.json({ cont: results.map(r => r.display_name) });
        } else if (categoria === "projects") {
          return Response.json({ cont: [] });
        }

        const resultadoRaw = db.query(`PRAGMA table_info(${categoria})`).all() as ColumnInfo[];
        const nombresDeColumnas = resultadoRaw.map((col) => col.name);
        return Response.json({
          cont: nombresDeColumnas
        });
      },
    },

    "/api/search": {
      async POST(req) {
        const body = await req.json() as { 
          query?: string, 
          challenges?: string[], 
          locations?: string[],
          hasAward?: boolean,
          orderBy?: string,
          limit?: number, 
          offset?: number 
        };
        const { query, challenges = [], locations = [], hasAward = false, orderBy = "default", limit = 50, offset = 0 } = body;

        let whereClause = " WHERE 1=1";
        const params: any[] = [];

        if (query && query.trim() !== "") {
          whereClause += " AND p.name LIKE ?";
          params.push(`%${query.trim()}%`);
        }

        if (challenges.length > 0) {
          const placeholders = challenges.map(() => "?").join(",");
          whereClause += ` AND c.title IN (${placeholders})`;
          params.push(...challenges);
        }

        if (locations.length > 0) {
          const placeholders = locations.map(() => "?").join(",");
          whereClause += ` AND l.display_name IN (${placeholders})`;
          params.push(...locations);
        }

        if (hasAward) {
          whereClause += " AND p.badges IS NOT NULL AND p.badges != ''";
        }

        const baseSql = `
          FROM projects p
          LEFT JOIN locations l ON p.location = l.id
          LEFT JOIN challenges c ON p.challenge = c.id
          ${whereClause}
        `;

        const countSql = `SELECT COUNT(*) as total ${baseSql}`;
        const totalResult = db.query(countSql).get(...params) as { total: number };
        const total = totalResult ? totalResult.total : 0;

        let orderClause = "ORDER BY p.id ASC";
        if (orderBy === "awards") {
          // Count commas + 1. If null or empty, 0.
          orderClause = `
            ORDER BY (
              CASE 
                WHEN p.badges IS NULL OR p.badges = '' THEN 0
                ELSE (LENGTH(p.badges) - LENGTH(REPLACE(p.badges, ',', ''))) + 1
              END
            ) DESC, p.id ASC
          `;
        }

        const selectSql = `
          SELECT p.id, p.name, l.display_name as location, c.title as challenge, p.badges, p.link
          ${baseSql}
          ${orderClause}
          LIMIT ? OFFSET ?
        `;
        
        const results = db.query(selectSql).all(...params, limit, offset) as Project[];
        
        return Response.json({ 
          cont: results,
          total: total
        });
      }
    },

    // Catch-all for React routing
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

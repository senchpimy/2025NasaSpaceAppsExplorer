import type { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'nasa_projects_2025.db');
const AVAILABLE_YEARS = [2025, 2024, 2023];

function parseYear(value: unknown): number {
  const year = Number(value);
  return AVAILABLE_YEARS.includes(year) ? year : 2025;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { cat } = req.query;

  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const categoria = cat as string;
    const year = parseYear(req.query.year);
    
    if (categoria === "challenges") {
      const results = db.prepare(`
        SELECT DISTINCT c.title
        FROM challenges c
        JOIN projects p ON p.challenge = c.id
        WHERE p.year = ? AND c.title IS NOT NULL
        ORDER BY c.title
      `).all(year) as { title: string }[];
      return res.status(200).json({ cont: results.map(r => r.title) });
    } else if (categoria === "locations") {
      const results = db.prepare(`
        SELECT DISTINCT l.display_name
        FROM locations l
        JOIN projects p ON p.location = l.id
        WHERE p.year = ? AND l.display_name IS NOT NULL
        ORDER BY l.display_name
      `).all(year) as { display_name: string }[];
      return res.status(200).json({ cont: results.map(r => r.display_name) });
    } else if (categoria === "projects") {
      const results = db.prepare(`
        SELECT DISTINCT c.description
        FROM challenges c
        JOIN projects p ON p.challenge = c.id
        WHERE p.year = ? AND c.description LIKE '%(%)%'
      `).all(year) as { description: string }[];
      const temas = new Set<string>();
      results.forEach(r => {
        const match = r.description.match(/\(([^)]+)\)\s*$/);
        if (match?.[1]) {
          temas.add(match[1]);
        }
      });
      return res.status(200).json({ cont: Array.from(temas).sort() });
    }

    // Para cualquier otra tabla (PRAGMA table_info)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(categoria);
    if (tableCheck) {
        const resultadoRaw = db.prepare(`PRAGMA table_info(${categoria})`).all() as any[];
        const nombresDeColumnas = resultadoRaw.map((col) => col.name);
        return res.status(200).json({ cont: nombresDeColumnas });
    }

    return res.status(404).json({ error: "Category not found" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}

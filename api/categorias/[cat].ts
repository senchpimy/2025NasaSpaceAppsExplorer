import { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'nasa_projects_2025.db');

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
    
    if (categoria === "challenges") {
      const results = db.prepare("SELECT DISTINCT title FROM challenges WHERE title IS NOT NULL ORDER BY title").all() as { title: string }[];
      return res.status(200).json({ cont: results.map(r => r.title) });
    } else if (categoria === "locations") {
      const results = db.prepare("SELECT DISTINCT display_name FROM locations WHERE display_name IS NOT NULL ORDER BY display_name").all() as { display_name: string }[];
      return res.status(200).json({ cont: results.map(r => r.display_name) });
    } else if (categoria === "projects") {
      const results = db.prepare("SELECT description FROM challenges WHERE description LIKE '%(%)%'").all() as { description: string }[];
      const temas = new Set<string>();
      results.forEach(r => {
        const match = r.description.match(/\(([^)]+)\)\s*$/);
        if (match) {
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

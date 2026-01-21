import { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'nasa_projects_2025.db');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuración de CORS para permitir peticiones desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const { 
      query, 
      projects = [], 
      challenges = [], 
      locations = [], 
      hasAward = false, 
      orderBy = "default", 
      limit = 50, 
      offset = 0 
    } = req.body;

    let whereClause = " WHERE 1=1";
    const params: any[] = [];

    if (query && query.trim() !== "") {
      whereClause += " AND p.name LIKE ?";
      params.push(`%${query.trim()}%`);
    }

    if (projects.length > 0) {
      const placeholders = projects.map(() => "?").join(",");
      whereClause += ` AND p.name IN (${placeholders})`;
      params.push(...projects);
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
      whereClause += " AND p.badges LIKE '%Winner%'";
    }

    const baseSql = `
      FROM projects p
      LEFT JOIN locations l ON p.location = l.id
      LEFT JOIN challenges c ON p.challenge = c.id
      ${whereClause}
    `;

    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const totalResult = db.prepare(countSql).get(...params) as { total: number };
    const total = totalResult ? totalResult.total : 0;

    let orderClause = "";
    const orderParams: any[] = [];
    
    if (orderBy === "awards") {
      orderClause = `
        ORDER BY (
          CASE 
            WHEN p.badges IS NULL OR p.badges = '' THEN 0
            ELSE (LENGTH(p.badges) - LENGTH(REPLACE(p.badges, ',', ''))) + 1
          END
        ) DESC, p.id ASC
      `;
    } else {
      const hasAwardScore = "(CASE WHEN p.badges IS NULL OR p.badges = '' THEN 1 ELSE 0 END)";
      if (query && query.trim() !== "") {
        const trimmedQuery = query.trim();
        orderClause = `
          ORDER BY 
            ${hasAwardScore} ASC,
            (CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END) ASC,
            p.id ASC
        `;
        orderParams.push(`${trimmedQuery}%`);
      } else {
        orderClause = `ORDER BY ${hasAwardScore} ASC, p.id ASC`;
      }
    }

    const selectSql = `
      SELECT p.id, p.name, l.display_name as location, c.title as challenge, p.badges, p.link
      ${baseSql}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    
    const results = db.prepare(selectSql).all(...params, ...orderParams, limit, offset);
    
    return res.status(200).json({ 
      cont: results,
      total: total
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}

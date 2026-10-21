import type { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';
import { computeFacets, parseFilters, type QueryDb } from '../lib/query.ts';

const dbPath = path.join(process.cwd(), 'nasa_projects_2025.db');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const queryDb: QueryDb = {
      all<T>(sql: string, ...params: unknown[]): T[] {
        return db.prepare(sql).all(...params) as T[];
      },
    };
    const filters = parseFilters(req.query as Record<string, unknown>);
    return res.status(200).json(computeFacets(queryDb, filters));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}

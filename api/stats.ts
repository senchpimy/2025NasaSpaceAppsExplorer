import type { VercelRequest, VercelResponse } from '@vercel/node';
import Database from 'better-sqlite3';
import path from 'path';
import { computeStats, type StatsDb } from './_lib/statsData.ts';

const dbPath = path.join(process.cwd(), 'nasa_projects_2025.db');
const AVAILABLE_YEARS = [2025, 2024, 2023];

function parseYear(value: unknown): number {
  const year = Number(value);
  return AVAILABLE_YEARS.includes(year) ? year : 2025;
}

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
    const year = parseYear(req.query.year);
    const statsDb: StatsDb = {
      all<T>(sql: string, ...params: unknown[]): T[] {
        return db.prepare(sql).all(...params) as T[];
      },
    };

    return res.status(200).json(computeStats(statsDb, year));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}

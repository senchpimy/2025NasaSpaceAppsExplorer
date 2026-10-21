import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const result: Record<string, unknown> = {};

  try {
    const query = await import('./_lib/query.ts');
    result.queryModule = typeof query.parseFilters;
  } catch (error) {
    result.queryError = error instanceof Error ? error.message : String(error);
  }

  try {
    const stats = await import('./_lib/statsData.ts');
    result.statsModule = typeof stats.computeStats;
  } catch (error) {
    result.statsError = error instanceof Error ? error.message : String(error);
  }

  try {
    const { default: Database } = await import('better-sqlite3');
    const path = await import('path');
    const db = new Database(path.join(process.cwd(), 'nasa_projects_2025.db'), { readonly: true });
    const row = db.prepare('SELECT COUNT(*) AS count FROM projects').get() as { count: number };
    result.dbProjects = row.count;
    db.close();
  } catch (error) {
    result.dbError = error instanceof Error ? error.message : String(error);
  }

  return res.status(200).json(result);
}

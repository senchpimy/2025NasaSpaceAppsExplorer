// server/api/stats.ts
import Database from "better-sqlite3";
import path from "path";

// server/lib/statsData.ts
var REGIONS = {
  "Asia del Sur": ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan", "Afghanistan", "Maldives"],
  "América Latina": ["Brazil", "Mexico", "Peru", "Colombia", "Argentina", "Chile", "Ecuador", "Bolivia", "Venezuela", "Paraguay", "Uruguay", "Costa Rica", "Guatemala", "Panama", "Dominican Republic", "Honduras", "El Salvador", "Nicaragua", "Cuba", "Puerto Rico"],
  MENA: ["Egypt", "United Arab Emirates", "Saudi Arabia", "Turkey", "Türkiye", "Morocco", "Algeria", "Tunisia", "Jordan", "Lebanon", "Iraq", "Iran", "Israel", "Qatar", "Kuwait", "Oman", "Bahrain", "Yemen", "Libya", "Syria"],
  "Norteamérica": ["United States", "USA", "Canada"],
  Europa: ["United Kingdom", "Germany", "France", "Spain", "Italy", "Poland", "Romania", "Netherlands", "Portugal", "Greece", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Belgium", "Switzerland", "Austria", "Czech Republic", "Czechia", "Hungary", "Ukraine", "Serbia", "Croatia", "Bulgaria", "Slovakia", "Slovenia", "Lithuania", "Latvia", "Estonia", "Moldova", "Albania", "North Macedonia", "Bosnia and Herzegovina", "Iceland", "Luxembourg", "Malta", "Cyprus"]
};
var COUNTRY_TO_REGION = new Map;
for (const [region, countries] of Object.entries(REGIONS)) {
  for (const country of countries)
    COUNTRY_TO_REGION.set(country, region);
}
var TECH_WORDS = /\b(ai|ml|neural|robot|robotic|tech|smart|machine learning|deep learning)\b/i;
var FOCUS_PATTERNS = [
  { label: "Tierra y ecología", pattern: /earth|eco|green|climate|ocean|water|forest|farm|agri|weather|environment/i },
  { label: "Tecnología e IA", pattern: /\b(ai|ml|neural|robot|tech|smart|data|deep|machine|algorithm)\b/i },
  { label: "Espacio y cosmos", pattern: /space|astro|star|galaxy|cosmic|planet|mars|moon|orbit|satellite|rocket|exoplanet|nasa/i },
  { label: "Misión NASA", pattern: /nasa|mission|artemis|apollo/i }
];
var round = (value) => Math.round(value * 10) / 10;
var rate = (part, total) => total > 0 ? round(part / total * 100) : 0;
var hasBadge = (badges, term) => !!badges && badges.toLowerCase().includes(term);
var isNominee = (row) => hasBadge(row.badges, "nominee");
var isWinner = (row) => hasBadge(row.badges, "winner");
var isFinalist = (row) => hasBadge(row.badges, "finalist");
var isLocalAward = (row) => /people['’]?s choice|local winner|local award/i.test(row.badges || "");
var cityOf = (row) => (row.location || "").split(",")[0]?.trim() || "";
var isVirtual = (row) => {
  const location = (row.location || "").toLowerCase();
  const country = (row.country || "").toLowerCase();
  return location.includes("virtual") || location.includes("universal event") || country === "anywhere in the world" || country === "global" || !row.country;
};
function top(items, count = 10) {
  return [...items].sort((a, b) => b.value - a.value).slice(0, count);
}
function groupCount(rows, key, filterKey) {
  const map = new Map;
  for (const row of rows) {
    const value = key(row)?.trim();
    if (!value)
      continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value, filterValue: filterKey ? filterKey(label) : label }));
}
function groupRate(rows, key, minTotal = 0) {
  const map = new Map;
  for (const row of rows) {
    const value = key(row)?.trim();
    if (!value)
      continue;
    const current = map.get(value) ?? { total: 0, nominees: 0 };
    current.total += 1;
    if (isNominee(row))
      current.nominees += 1;
    map.set(value, current);
  }
  return [...map.entries()].filter(([, value]) => value.total >= minTotal).map(([label, value]) => ({ label, value: rate(value.nominees, value.total), n: value.total, filterValue: label })).sort((a, b) => b.value - a.value);
}
function rateFor(rows, predicate) {
  const selected = rows.filter(predicate);
  return { value: rate(selected.filter(isNominee).length, selected.length), n: selected.length };
}
function wordCount(name) {
  return name.trim().split(/\s+/).filter(Boolean).length;
}
function rowsForYear(db, year) {
  return db.all(`SELECT p.id, p.name, p.badges, p.link,
            l.display_name AS location, l.country AS country,
            c.title AS challenge
     FROM projects p
     LEFT JOIN locations l ON p.location = l.id
     LEFT JOIN challenges c ON p.challenge = c.id
     WHERE p.year = ?`, year);
}
function metricsForYear(db, year) {
  const row = db.all(`SELECT COUNT(*) AS totalProjects,
            COUNT(DISTINCT NULLIF(TRIM(l.country), '')) AS countries,
            COUNT(DISTINCT NULLIF(TRIM(l.display_name), '')) AS localEvents,
            SUM(CASE WHEN lower(p.badges) LIKE '%nominee%' THEN 1 ELSE 0 END) AS nominees,
            SUM(CASE WHEN lower(p.badges) LIKE '%winner%' THEN 1 ELSE 0 END) AS winners
     FROM projects p
     LEFT JOIN locations l ON p.location = l.id
     WHERE p.year = ?`, year)[0];
  return {
    totalProjects: row?.totalProjects ?? 0,
    countries: row?.countries ?? 0,
    localEvents: row?.localEvents ?? 0,
    nominees: row?.nominees ?? 0,
    winners: row?.winners ?? 0
  };
}
function computeStats(db, year) {
  const rows = rowsForYear(db, year);
  const metrics = metricsForYear(db, year);
  const previous = year > 2023 ? metricsForYear(db, year - 1) : null;
  const delta = (key) => previous ? metrics[key] - previous[key] : null;
  const winners = rows.filter(isWinner);
  const finalists = rows.filter((row) => isFinalist(row) && !isWinner(row));
  const challengeData = top(groupCount(rows, (row) => row.challenge), 10);
  const countryData = top(groupCount(rows, (row) => row.country, (value) => value), 10);
  const cityData = top(groupCount(rows, (row) => isVirtual(row) ? null : cityOf(row)), 10);
  const nominationRateData = top(groupRate(rows, (row) => row.challenge, 100), 10);
  const efficiencyData = top(groupRate(rows, (row) => row.country, 30), 10);
  const nameBuckets = [
    { label: "1 palabra", ...rateFor(rows, (row) => wordCount(row.name) === 1) },
    { label: "2 palabras", ...rateFor(rows, (row) => wordCount(row.name) === 2) },
    { label: "3+ palabras", ...rateFor(rows, (row) => wordCount(row.name) >= 3) }
  ];
  const techKeywordData = [
    { label: "Con IA/tecnología", ...rateFor(rows, (row) => TECH_WORDS.test(row.name)) },
    { label: "General", ...rateFor(rows, (row) => !TECH_WORDS.test(row.name)) }
  ];
  const citiesMap = new Map;
  for (const row of rows) {
    if (isVirtual(row))
      continue;
    const country = row.country?.trim();
    const city = cityOf(row);
    if (!country || !city)
      continue;
    const cities = citiesMap.get(country) ?? new Set;
    cities.add(city);
    citiesMap.set(country, cities);
  }
  const citiesPerCountry = top([...citiesMap.entries()].map(([label, cities]) => ({ label, value: cities.size, filterValue: label })), 10);
  const virtualRows = rows.filter(isVirtual);
  const physicalRows = rows.filter((row) => !isVirtual(row));
  const virtualVsPhysical = [
    { label: "Virtual", value: rate(virtualRows.filter(isNominee).length, virtualRows.length), n: virtualRows.length },
    { label: "Presencial", value: rate(physicalRows.filter(isNominee).length, physicalRows.length), n: physicalRows.length }
  ];
  const regionCounts = new Map;
  const regionTotals = new Map;
  for (const row of rows) {
    const region = row.country && COUNTRY_TO_REGION.get(row.country) || "Otros/mixto";
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
    const current = regionTotals.get(region) ?? { total: 0, nominees: 0 };
    current.total += 1;
    if (isNominee(row))
      current.nominees += 1;
    regionTotals.set(region, current);
  }
  const regionOrder = ["Asia del Sur", "América Latina", "MENA", "Norteamérica", "Europa", "Otros/mixto"];
  const regionalParticipation = regionOrder.map((label) => ({ label, value: regionCounts.get(label) ?? 0 }));
  const regionalSuccessRate = regionOrder.filter((region) => region !== "Otros/mixto").map((label) => {
    const value = regionTotals.get(label) ?? { total: 0, nominees: 0 };
    return { label, value: rate(value.nominees, value.total), n: value.total };
  }).filter((item) => (item.n ?? 0) >= 30).sort((a, b) => b.value - a.value);
  const projectFocusData = FOCUS_PATTERNS.map(({ label, pattern }) => ({ label, ...rateFor(rows, (row) => pattern.test(row.name)) }));
  const funnel = [
    { label: "Proyectos", value: metrics.totalProjects, shareOfTotal: 100, conversion: null },
    { label: "Nominados globales", value: metrics.nominees, shareOfTotal: rate(metrics.nominees, metrics.totalProjects), conversion: rate(metrics.nominees, metrics.totalProjects) },
    { label: "Finalistas globales", value: finalists.length + winners.length, shareOfTotal: rate(finalists.length + winners.length, metrics.totalProjects), conversion: rate(finalists.length + winners.length, metrics.nominees) },
    { label: "Ganadores globales", value: metrics.winners, shareOfTotal: rate(metrics.winners, metrics.totalProjects), conversion: rate(metrics.winners, finalists.length + winners.length) }
  ];
  const winnersByCountry = top(groupCount(winners, (row) => row.country, (value) => value), 10);
  const localRows = rows.filter(isLocalAward);
  const localByCountry = new Map;
  for (const row of localRows) {
    const country = row.country?.trim() || "Sin país";
    const current = localByCountry.get(country) ?? { local: 0, nominees: 0, finalists: 0, winners: 0 };
    current.local += 1;
    if (isNominee(row))
      current.nominees += 1;
    if (isFinalist(row))
      current.finalists += 1;
    if (isWinner(row))
      current.winners += 1;
    localByCountry.set(country, current);
  }
  const localGlobal = {
    hasLocalData: localRows.length > 0,
    localAwards: localRows.length,
    nominees: localRows.filter(isNominee).length,
    finalists: localRows.filter(isFinalist).length,
    winners: localRows.filter(isWinner).length,
    toNominee: rate(localRows.filter(isNominee).length, localRows.length),
    toFinalist: rate(localRows.filter(isFinalist).length, localRows.length),
    byCountry: [...localByCountry.entries()].map(([country, value]) => ({
      country,
      ...value,
      toNominee: rate(value.nominees, value.local),
      toFinalist: rate(value.finalists, value.local)
    })).sort((a, b) => b.local - a.local || a.country.localeCompare(b.country))
  };
  const top3 = challengeData.slice(0, 3);
  const top3Count = top3.reduce((sum, item) => sum + item.value, 0);
  const top3Share = rate(top3Count, metrics.totalProjects);
  const topCountry = countryData[0];
  const topChallenge = challengeData[0];
  const virtualItem = virtualVsPhysical[0];
  const physicalItem = virtualVsPhysical[1];
  const findings = [
    top3.length > 0 ? `Tres retos concentraron el ${top3Share}% de los proyectos: ${top3.map((item) => item.label.split(":")[0]).join(", ")}.` : "No hay suficientes proyectos para describir la participación por reto.",
    topCountry ? `${topCountry.label} lideró la participación con ${topCountry.value.toLocaleString()} proyectos. ${metrics.nominees.toLocaleString()} proyectos recibieron una nominación global (${rate(metrics.nominees, metrics.totalProjects)}%).` : "No hay datos de países para este año.",
    metrics.totalProjects > 0 ? `Solo ${metrics.winners} proyectos fueron ganadores globales. ${topChallenge ? `El reto más concurrido fue ${topChallenge.label.split(":")[0]}.` : ""}` : "No hay proyectos registrados para este año."
  ];
  return {
    year,
    metrics,
    deltas: {
      totalProjects: delta("totalProjects"),
      countries: delta("countries"),
      localEvents: delta("localEvents"),
      nominees: delta("nominees"),
      winners: delta("winners")
    },
    findings,
    challengeData,
    countryData,
    cityData,
    nominationRateData,
    efficiencyData,
    nameComplexityData: nameBuckets,
    techKeywordData,
    citiesPerCountry,
    virtualVsPhysical,
    regionalParticipation,
    regionalSuccessRate,
    projectFocusData,
    funnel,
    winnersByCountry,
    localGlobal,
    winners: winners.map((row) => ({ name: row.name, link: row.link, country: row.country || "Sin país", award: "Ganador global", badges: row.badges }))
  };
}

// server/api/stats.ts
var dbPath = path.join(process.cwd(), "nasa_projects_2025.db");
var AVAILABLE_YEARS = [2025, 2024, 2023];
function parseYear(value) {
  const year = Number(value);
  return AVAILABLE_YEARS.includes(year) ? year : 2025;
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const db = new Database(dbPath, { readonly: true });
  try {
    const year = parseYear(req.query.year);
    const statsDb = {
      all(sql, ...params) {
        return db.prepare(sql).all(...params);
      }
    };
    return res.status(200).json(computeStats(statsDb, year));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
}
export {
  handler as default
};

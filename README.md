# NASA Space Apps 2025 Explorer — App

Aplicación web para explorar los proyectos del NASA Space Apps Challenge entre
2023 y 2025. Está construida con **Bun**, **React 19**, **TypeScript**,
**Tailwind CSS** y **SQLite** (`bun:sqlite` en desarrollo, `better-sqlite3` en
Vercel).

## Requisitos

- [Bun](https://bun.com) 1.2+

## Desarrollo

```bash
bun install
bun dev
```

El servidor arranca en `http://localhost:3000` y sirve el frontend con HMR y las
rutas de API definidas en `src/index.ts`.

## Producción

```bash
bun run build   # compila el frontend en dist/
bun start       # sirve la app
```

## API

| Ruta | Método | Descripción |
| --- | --- | --- |
| `/api/facets` | `GET` | Opciones de reto, país y ciudad con conteos vivos. Acepta `year`, `q`, `reto`, `pais`, `ciudad` y `premio`. |
| `/api/search` | `GET`/`POST` | Búsqueda paginada. Acepta `q`, `reto`, `pais`, `ciudad`, `premio`, `orden`, `pagina`, `limit` y `year`. |
| `/api/stats` | `GET` | Informe estadístico del año indicado con `?year=`. |

## Base de datos

`nasa_projects_2025.db` es la base canónica de la app:

```text
locations  (id, display_name, country)
challenges (id, title, description)
projects   (id, name, location, challenge, badges, link, year, summary, search_text)
```

Para actualizarla, usa el scraper de la raíz del repositorio:

```bash
python scraper/scrape.py              # 2025
python scraper/scrape.py --year 2024  # 2024
python scraper/scrape.py --year 2023  # 2023
```

Consulta el [README principal](../README.md) para la estructura completa del
proyecto.

## Despliegue en Vercel

`vercel.json` incluye la base de datos en las funciones serverless y reescribe
las rutas. Las funciones de `api/` son la versión serverless de las rutas de
`src/index.ts`.

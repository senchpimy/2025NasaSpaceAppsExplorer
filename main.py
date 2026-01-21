import requests
import sqlite3
import json
import time
import random
import base64
from multiprocessing import Pool, Manager, Lock

# --- CONFIGURACIÓN ---
DB_NAME = "nasa_projects_2025.db"
URL = "https://api.spaceappschallenge.org/graphql"
BASE_DOMAIN = "https://www.spaceappschallenge.org"
BATCH_SIZE = 50       # Tamaño de página
# Número de "robots" simultáneos (No subas mucho esto para evitar ban)
NUM_PROCESSES = 5

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
}

# Query optimizada
QUERY = """
query Teams($first: Int!, $after: String, $filtering: [Filter!]) {
  teams(first: $first, after: $after, filtering: $filtering) {
    edges {
      node {
        id
        title
        meta { relativeUrl }
        projectDetails { name }
        challengeDetails { id title excerpt }
        locationDetails { id title displayName country }
        nominationBadges
        awardBadges
      }
    }
  }
}
"""


def create_cursor(offset_index):
    """
    TRUCO: Genera un cursor de GraphQL manualmente.
    El cursor es simplemente 'offset:NUMBER' codificado en Base64.
    """
    if offset_index == 0:
        return ""  # Primera página
    # offset:49 significa "dame lo que sigue después del item 49" (o sea, empieza en el 50)
    raw_cursor = f"offset:{offset_index - 1}"
    return base64.b64encode(raw_cursor.encode('utf-8')).decode('utf-8')


def format_full_location(loc_details):
    if not loc_details:
        return "Virtual / Global"
    display = loc_details.get('displayName')
    title = loc_details.get('title')
    city = display if (display and display.strip()
                       ) else (title or "Unknown City")
    country = loc_details.get('country')
    if city and country:
        return f"{city}, {country}"
    return country if country else city


def process_badges(node):
    badges = []
    if node.get('nominationBadges'):
        badges.extend(node['nominationBadges'])
    if node.get('awardBadges'):
        badges.extend(node['awardBadges'])
    return ", ".join(badges) if badges else None


def get_total_count():
    """Hace una pequeña petición inicial solo para saber cuántos equipos hay."""
    print("🔍 Consultando cantidad total de equipos...")
    q = """query Teams { teams(first: 1, filtering: [{field: "event", value: "2025 NASA Space Apps Challenge", compare: "in"}]) { totalCount } }"""
    try:
        r = requests.post(URL, headers=HEADERS, json={"query": q}, timeout=10)
        return r.json()['data']['teams']['totalCount']
    except Exception as e:
        print(f"Error obteniendo total: {e}")
        return 20000  # Fallback por si acaso


def scrape_worker(args):
    """
    Esta es la función que ejecuta cada proceso independiente.
    """
    offset, lock = args
    cursor_str = create_cursor(offset)

    # Variables de la petición
    variables = {
        "first": BATCH_SIZE,
        "after": cursor_str,
        "filtering": [{"field": "event", "value": "2025 NASA Space Apps Challenge", "compare": "in"}]
    }

    # Delay aleatorio para parecer humanos distintos
    time.sleep(random.uniform(0.5, 2.0))

    try:
        response = requests.post(URL, headers=HEADERS, json={
                                 "query": QUERY, "variables": variables}, timeout=30)

        if response.status_code != 200:
            print(f"⚠️ Error HTTP {response.status_code} en offset {offset}")
            return 0

        data = response.json()
        edges = data.get('data', {}).get('teams', {}).get('edges', [])

        if not edges:
            return 0

        # --- SECCIÓN DE ESCRITURA EN DB (CON CANDADO) ---
        # Usamos lock para que dos procesos no intenten escribir en el archivo SQLite al mismo tiempo
        with lock:
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()

            for item in edges:
                node = item['node']

                # Preparar datos
                p_id = node.get('id')

                proj_d = node.get('projectDetails') or {}
                p_name = proj_d.get('name') or node.get('title') or "Untitled"

                meta = node.get('meta') or {}
                p_link = meta.get('relativeUrl') or "N/A"

                loc_d = node.get('locationDetails') or {}
                p_loc = format_full_location(loc_d)

                chal_d = node.get('challengeDetails') or {}
                p_chal = chal_d.get('title') or "Unknown Challenge"

                p_badges = process_badges(node)

                # Inserts
                if loc_d.get('id'):
                    cursor.execute('INSERT OR IGNORE INTO locations (id, display_name, country) VALUES (?, ?, ?)',
                                   (loc_d.get('id'), p_loc, loc_d.get('country')))

                if chal_d.get('id'):
                    cursor.execute('INSERT OR IGNORE INTO challenges (id, title, description) VALUES (?, ?, ?)',
                                   (chal_d.get('id'), p_chal, chal_d.get('excerpt')))

                    # Evitamos duplicados por link
                    cursor.execute('''
                        INSERT INTO projects (name, location, challenge, badges, link)
                        SELECT ?, ?, ?, ?, ?
                        WHERE NOT EXISTS (SELECT 1 FROM projects WHERE link = ?)
                    ''', (p_name, loc_d.get('id'), chal_d.get('id'), p_badges, p_link, p_link))

            conn.commit()
            conn.close()

        print(f"✅ Lote guardado: offset {offset} ({len(edges)} items)")
        return len(edges)

    except Exception as e:
        print(f"❌ Error en worker offset {offset}: {e}")
        return 0


def create_schema():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        'CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, display_name TEXT, country TEXT)')
    cursor.execute(
        'CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, title TEXT, description TEXT)')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT, 
            challenge TEXT NOT NULL,
            badges TEXT,
            link TEXT NOT NULL,
            FOREIGN KEY(location) REFERENCES locations(id),
            FOREIGN KEY(challenge) REFERENCES challenges(id)
        )
    ''')
    conn.commit()
    conn.close()


if __name__ == "__main__":
    # 1. Configurar DB
    create_schema()

    # 2. Obtener total y calcular puntos de partida
    total_records = get_total_count()
    print(f"🎯 Objetivo: Scrapear ~{total_records} proyectos.")

    # Generamos la lista de offsets: [0, 50, 100, 150, ..., 19000]
    # Esto permite que cada proceso tome un número y trabaje independiente
    offsets = list(range(0, total_records + BATCH_SIZE, BATCH_SIZE))

    # 3. Preparar Multiprocessing
    manager = Manager()
    db_lock = manager.Lock()  # Candado compartido para la base de datos

    # Empaquetamos argumentos para el worker (offset, lock)
    worker_args = [(off, db_lock) for off in offsets]

    print(f"🚀 Iniciando {NUM_PROCESSES} procesos paralelos...")
    start_time = time.time()

    # 4. Ejecutar Pool
    with Pool(processes=NUM_PROCESSES) as pool:
        results = pool.map(scrape_worker, worker_args)

    # 5. Finalizar
    total_saved = sum(results)
    duration = time.time() - start_time
    print(f"\n🎉 ¡Terminado! Procesados {
          total_saved} registros en {duration:.2f} segundos.")

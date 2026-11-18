"""
Carga los CSV de data/csv/ a la base D1 a través de la API (/api/admin/cargar).

  python data/cargar_datos.py --url http://localhost:5173                       # local (cf dev)
  python data/cargar_datos.py --url https://<tu-worker>.workers.dev --token-archivo .dev.vars.nube

Qué hace:
  1. Vacía las tablas en orden seguro (primero movimientos, luego catálogos).
  2. Sube cada CSV en partes de 2,000 filas (primero catálogos, luego movimientos).
  3. Verifica con /api/salud que el número de filas coincida.

La clave de administrador se lee del archivo indicado (por defecto .dev.vars), línea ADMIN_TOKEN=...
Solo usa la biblioteca estándar de Python.

Ojo con el plan gratis de Cloudflare: cada carga completa escribe ~35 mil filas
(borrar + insertar ≈ 70 mil escrituras); el límite diario es 100 mil. En local no hay límite.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ORDEN_CARGA = ["tiendas", "productos", "ventas_pos", "depositos", "gastos", "ventas_producto"]
PARTE = 2000
RAIZ = Path(__file__).resolve().parent.parent


def leer_token(archivo: Path) -> str:
    if not archivo.exists():
        sys.exit(f"No encontré {archivo}. Crea el archivo con la línea ADMIN_TOKEN=... (ver docs/infra/README.md)")
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        if linea.strip().startswith("ADMIN_TOKEN="):
            return linea.split("=", 1)[1].strip().strip('"')
    sys.exit(f"{archivo} no tiene la línea ADMIN_TOKEN=...")


def peticion(url: str, token: str | None = None, cuerpo: bytes | None = None) -> dict:
    req = urllib.request.Request(url, data=cuerpo, method="POST" if cuerpo is not None else "GET")
    req.add_header("User-Agent", "pulso-financiero-cargador/1.0")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if cuerpo is not None:
        req.add_header("Content-Type", "text/csv; charset=utf-8")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "replace")
        sys.exit(f"Error {e.code} en {url}:\n{detalle}")
    except urllib.error.URLError as e:
        sys.exit(f"No pude conectar con {url}: {e.reason}. ¿Está corriendo el servidor (npm run dev)?")


def main() -> None:
    ap = argparse.ArgumentParser(description="Carga data/csv/*.csv a la base D1")
    ap.add_argument("--url", required=True, help="URL base, ej. http://localhost:5173")
    ap.add_argument("--token-archivo", default=str(RAIZ / ".dev.vars"))
    ap.add_argument("--carpeta", default=str(RAIZ / "data" / "csv"))
    a = ap.parse_args()

    base = a.url.rstrip("/")
    token = leer_token(Path(a.token_archivo))
    carpeta = Path(a.carpeta)

    print("1) Vaciando tablas…")
    for tabla in reversed(ORDEN_CARGA):
        r = peticion(f"{base}/api/admin/vaciar?tabla={tabla}", token, b"")
        print(f"   {tabla:<16} {r['filas_borradas']:>7,} filas borradas")

    print("2) Cargando CSV…")
    esperadas = {}
    for tabla in ORDEN_CARGA:
        lineas = (carpeta / f"{tabla}.csv").read_text(encoding="utf-8").splitlines()
        encabezado, filas = lineas[0], lineas[1:]
        esperadas[tabla] = len(filas)
        for i in range(0, len(filas), PARTE):
            parte = "\n".join([encabezado, *filas[i : i + PARTE]]).encode("utf-8")
            q = urllib.parse.urlencode({"tabla": tabla, "modo": "agregar", "origen": f"{tabla}.csv"})
            peticion(f"{base}/api/admin/cargar?{q}", token, parte)
        print(f"   {tabla:<16} {len(filas):>7,} filas cargadas")

    print("3) Verificando…")
    salud = peticion(f"{base}/api/salud?fresco=1")
    ok = all(salud["filas"].get(t) == n for t, n in esperadas.items())
    for t, n in esperadas.items():
        print(f"   {t:<16} esperadas {n:>7,} · en la base {salud['filas'].get(t, 0):>7,}")
    print("Listo ✔" if ok else "ATENCIÓN: los conteos no coinciden")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

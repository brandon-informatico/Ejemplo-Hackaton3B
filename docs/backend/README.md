# Manual de la base de datos para backend · Pulso Financiero 3B

Para: **Patrick** y **Alejandro** (backend). Lo mantiene: **Omar** (datos).

Este manual explica cómo usar desde tu computadora la base de datos que ya tiene cargado el dataset limpio.

---

## 1. Resumen en un minuto

| Dato | Valor |
|---|---|
| Nombre de la base | `pulso-financiero-db` |
| ID de la base | `57eced06-ff9e-4e8f-9269-01a192a72432` |
| Tipo | **Cloudflare D1** (es SQLite en la nube: se consulta con SQL normal) |
| Contenido | El mismo dataset de [`/dataset/csv`](../../dataset/csv), ya cargado y verificado |
| Montos | En **centavos** (enteros). `4234550` = $42,345.50 → divide entre 100 para mostrar pesos |
| Costo | Gratis (plan gratuito de Cloudflare). Si se rebasa el límite diario, la base deja de responder hasta las 18:00 h (hora de México); **no cobra** |

**¿Base de datos o CSV?** Tienen exactamente los mismos datos. La base sirve para consultar con SQL desde cualquier lado; los CSV sirven para trabajar sin internet y sin gastar el límite diario.

---

## 2. ¿Qué forma de conexión uso?

| Si vas a… | Usa | Necesitas |
|---|---|---|
| Programar el backend en **Python** (pandas, FastAPI) en tu compu | **Opción A**: API de Cloudflare con un token | El token y el ID de cuenta que te pasa Omar |
| Hacer consultas rápidas desde la **terminal** | **Opción B**: CLI `cf` | Que Omar te invite a la cuenta de Cloudflare |
| **Ver las tablas** en el navegador sin programar | **Opción C**: panel de Cloudflare | Que Omar te invite a la cuenta de Cloudflare |
| Programar el backend **dentro de Cloudflare** (Workers) | **Opción D**: conexión directa (binding) | Acceso a la cuenta |
| Trabajar **sin internet** | Los CSV de [`/dataset/csv`](../../dataset/csv) | Nada |

Lo más común para este equipo es la **Opción A**.

---

## 3. Tablas

```
 tiendas (catálogo) ──┬── ventas_pos        (una fila por tienda y día)
                      ├── depositos         (una fila por tienda y día de venta)
                      ├── gastos ─────────── categorias_gasto (catálogo)
                      └── ventas_producto ── productos (catálogo)
```

| Tabla | Filas | Llave única | Columnas |
|---|---:|---|---|
| `tiendas` | 30 | `tienda_id` | tienda_id, nombre, region, ciudad, formato, fecha_apertura, m2 |
| `productos` | 40 | `producto_id` | producto_id, nombre, categoria, marca_propia (0/1), **precio_lista_centavos**, **costo_centavos** |
| `categorias_gasto` | 5 | `categoria` | categoria, nombre, tipo (`fijo` o `variable`) |
| `ventas_pos` | 4,984 | `fecha` + `tienda_id` | fecha, tienda_id, **venta_centavos**, tickets |
| `depositos` | 4,983 | `fecha_venta` + `tienda_id` | fecha_venta, tienda_id, fecha_deposito, **monto_centavos**, referencia |
| `gastos` | 825 | `mes` + `tienda_id` + `categoria` | mes, tienda_id, categoria, **monto_centavos** |
| `ventas_producto` | 6,600 | `mes` + `tienda_id` + `producto_id` | mes, tienda_id, producto_id, unidades, **venta_centavos**, **costo_centavos** |

Diferencias con los CSV: en la base, las columnas de dinero terminan en `_centavos` y son enteros (en el CSV están en pesos: `venta` = `venta_centavos / 100`). Así las sumas cuadran al centavo.

- Fechas: texto `AAAA-MM-DD` (ej. `'2026-10-19'`). Meses: texto `AAAA-MM` (ej. `'2026-10'`).
- Regiones: `Centro`, `Norte`, `Sur`, `Occidente`, `Bajío` (con acento). Formatos: `Compacta`, `Estándar`, `Plus`.
- Si en `depositos` falta la fila de un día, el banco no confirmó el depósito de ese día.
- Significado detallado de cada columna: [dataset/README.md](../../dataset/README.md).
- Tablas internas que **no hay que tocar**: `bitacora_cargas` (historial de cargas), `d1_migrations`, `sqlite_sequence`, `_cf_KV`.

---

## 4. Opción A · Python en tu computadora (recomendada)

### Paso 1 · Omar crea un token y te lo pasa (solo una vez)

> Esto lo hace **Omar**, no tú.

1. Entrar a https://dash.cloudflare.com → icono de usuario (arriba a la derecha) → **Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Nombre: `backend-hackaton-lectura`.
3. Permisos: **Account** → **D1** → **Read** (solo lectura). Si alguien de backend necesita escribir, hacer otro token con **Edit**.
4. Account Resources: **Include** → la cuenta del equipo.
5. **Create Token** y copiarlo (Cloudflare lo muestra **una sola vez**).
6. Copiar también el **Account ID** (está en el panel, en *Workers & Pages*, columna derecha).
7. Enviar ambos a cada persona de backend **por mensaje privado**. Nunca en GitHub ni en el chat grupal.

### Paso 2 · Preparar tu computadora

Necesitas Python 3.10 o más nuevo. Instala las librerías:

```powershell
python -m pip install requests pandas python-dotenv
```

### Paso 3 · Guardar tus claves en un archivo `.env`

En la carpeta del proyecto, crea un archivo llamado `.env` (así, con el punto al inicio) con lo que te pasó Omar:

```
CLOUDFLARE_ACCOUNT_ID=pega-aqui-el-account-id
CLOUDFLARE_API_TOKEN=pega-aqui-el-token
```

El archivo `.env` ya está en `.gitignore`, así que **Git no lo sube**. Nunca escribas el token dentro del código.

### Paso 4 · Copiar este archivo `d1.py`

```python
"""Conexión a la base D1 de Pulso Financiero 3B desde Python."""
import os

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()  # lee el archivo .env

BASE_ID = "57eced06-ff9e-4e8f-9269-01a192a72432"
URL = (
    f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
    f"/d1/database/{BASE_ID}/query"
)
ENCABEZADOS = {"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}"}


def consultar(sql: str, params: list | None = None) -> pd.DataFrame:
    """Ejecuta una consulta SQL y regresa una tabla de pandas.

    Usa ? para los valores que cambian (evita errores y ataques):
        consultar("SELECT * FROM tiendas WHERE region = ?", ["Sur"])
    """
    r = requests.post(URL, headers=ENCABEZADOS, json={"sql": sql, "params": params or []}, timeout=30)
    datos = r.json()
    if not datos.get("success"):
        raise RuntimeError(f"Error de D1: {datos.get('errors')}")
    return pd.DataFrame(datos["result"][0]["results"])


def cargar_tablas() -> dict[str, pd.DataFrame]:
    """Descarga todas las tablas UNA vez (≈ 17,500 filas leídas) para trabajar en memoria."""
    tablas = ["tiendas", "productos", "categorias_gasto", "ventas_pos", "depositos", "gastos", "ventas_producto"]
    return {t: consultar(f"SELECT * FROM {t}") for t in tablas}
```

### Paso 5 · Probar que funciona

```powershell
python -c "from d1 import consultar; print(consultar('SELECT COUNT(*) AS tiendas FROM tiendas'))"
```

Debe imprimir una tabla con el número **30**. Si sale un error, revisa la sección 9.

### Paso 6 · Cómo usarlo en tu código

**Recomendado (rápido y no gasta el límite):** descarga las tablas una sola vez al arrancar y calcula con pandas:

```python
from d1 import cargar_tablas

t = cargar_tablas()
ventas = t["ventas_pos"]
ventas["venta"] = ventas["venta_centavos"] / 100          # pesos, solo para mostrar
por_tienda = ventas.groupby("tienda_id")["venta_centavos"].sum() / 100
print(por_tienda.head())
```

**Consultas puntuales con SQL** (cuando solo necesitas un resultado chico):

```python
from d1 import consultar

df = consultar(
    "SELECT fecha, venta_centavos FROM ventas_pos WHERE tienda_id = ? AND fecha BETWEEN ? AND ?",
    ["T08", "2026-10-19", "2026-10-25"],
)
```

> Cada consulta tarda un poco porque viaja por internet a Cloudflare. Por eso conviene descargar las tablas una vez y no consultar en cada clic del tablero.

---

## 5. Opción B · Terminal con el CLI `cf`

Requisitos: Node.js instalado y que Omar te haya invitado a la cuenta de Cloudflare.

```powershell
npm install -g cf
```

```powershell
cf auth login
```

(se abre el navegador para que inicies sesión con tu cuenta de Cloudflare). Luego:

```powershell
cf d1 query 57eced06-ff9e-4e8f-9269-01a192a72432 --sql "SELECT * FROM tiendas WHERE region = ?" --params Sur
```

---

## 6. Opción C · Ver las tablas en el navegador

1. https://dash.cloudflare.com → **Storage & databases** → **D1 SQL database** → `pulso-financiero-db`.
2. Pestaña **Explore data** para ver las tablas, o **Console** para escribir SQL.

Ideal para revisar datos a mano (por ejemplo, la auditoría de 3 tiendas antes de la demo).

---

## 7. Opción D · Backend dentro de Cloudflare (Workers)

Si deciden programar el backend en Cloudflare, la base se conecta sin token. En `cloudflare.config.ts`:

```ts
import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		// ...
		env: {
			DB: bindings.d1({ name: "pulso-financiero-db", id: "57eced06-ff9e-4e8f-9269-01a192a72432" }),
		},
	},
});
```

Y en el código: `await env.DB.prepare("SELECT * FROM tiendas WHERE region = ?").bind("Sur").all()`.
Antes de hacerlo, avisar a Omar y Armando: cambia la configuración del servidor.

---

## 8. Consultas de ejemplo (probadas, con su resultado real)

**Venta por región en octubre 2026**

```sql
SELECT t.region, ROUND(SUM(v.venta_centavos) / 100.0, 2) AS venta_pesos
FROM ventas_pos v
JOIN tiendas t ON t.tienda_id = v.tienda_id
WHERE v.fecha BETWEEN '2026-10-01' AND '2026-10-31'
GROUP BY t.region
ORDER BY venta_pesos DESC;
```

| region | venta_pesos |
|---|---:|
| Norte | 17,381,250.96 |
| Occidente | 15,839,487.67 |
| Centro | 15,745,971.63 |
| Bajío | 14,779,451.95 |
| Sur | 14,062,766.92 |

**Venta POS contra depósito por semana (Tienda 08)**

```sql
SELECT date(v.fecha, '-6 days', 'weekday 1') AS semana,          -- lunes de la semana
       SUM(v.venta_centavos) / 100.0 AS venta_pos,
       COALESCE(SUM(d.monto_centavos), 0) / 100.0 AS depositado,
       (SUM(v.venta_centavos) - COALESCE(SUM(d.monto_centavos), 0)) / 100.0 AS diferencia
FROM ventas_pos v
LEFT JOIN depositos d ON d.fecha_venta = v.fecha AND d.tienda_id = v.tienda_id
WHERE v.tienda_id = 'T08' AND v.fecha BETWEEN '2026-10-12' AND '2026-10-25'
GROUP BY semana;
```

| semana | venta_pos | depositado | diferencia |
|---|---:|---:|---:|
| 2026-10-12 | 633,347.65 | 633,356.18 | −8.53 |
| 2026-10-19 | 602,119.46 | 590,077.07 | 12,042.39 |

Se usa `LEFT JOIN` para no perder los días en que el banco no confirmó depósito.

**Gasto de luz de la Tienda 12 por mes**

```sql
SELECT mes, monto_centavos / 100.0 AS luz
FROM gastos
WHERE tienda_id = 'T12' AND categoria = 'luz'
ORDER BY mes;
```

| mes | luz |
|---|---:|
| 2026-05 | 30,488.03 |
| 2026-06 | 36,866.78 |
| 2026-07 | 35,924.30 |
| 2026-08 | 31,092.56 |
| 2026-09 | 33,601.42 |
| 2026-10 | 44,942.83 |

---

## 9. Reglas de uso (la base es compartida por todo el equipo)

1. **Solo lectura por defecto.** No hagas `INSERT`, `UPDATE`, `DELETE`, `DROP` ni `ALTER` sin avisar a Omar.
2. **El límite diario es de TODO el equipo junto**: 5 millones de filas leídas al día y 100,000 escritas. Un `SELECT * FROM ventas_pos` lee ~5,000 filas. Descarga las tablas una vez (`cargar_tablas()`) en lugar de consultar en cada clic.
3. Filtra por fecha (`WHERE fecha BETWEEN ...`): la base lee menos filas.
4. Suma en centavos y divide entre 100 **solo al final** (nunca sumes pesos con decimales).
5. Nunca subas el token a GitHub ni lo pegues en el chat grupal. Si pasa, avisa a Omar para que lo borre y cree otro.
6. Si necesitas una tabla o columna nueva, pídela a Omar: así queda documentada en [CONTEXT.md](../../CONTEXT.md).

---

## 10. Si algo falla

| Mensaje o síntoma | Qué hacer |
|---|---|
| `KeyError: 'CLOUDFLARE_ACCOUNT_ID'` | No existe el `.env` o está en otra carpeta: debe estar donde corres Python. |
| `Error de D1: ... Authentication error` | El token está mal copiado o se borró: pide uno nuevo a Omar. |
| `no such table` | Revisa el nombre de la tabla (sección 3). |
| `no such column: venta` | En la base las columnas de dinero terminan en `_centavos`. |
| Error de límite diario | Se acabó el límite gratis del día: usa los CSV hasta las 18:00 h. |
| Error 429 / demasiadas peticiones | Cloudflare permite ~1,200 peticiones cada 5 minutos por usuario: usa `cargar_tablas()` y trabaja en memoria. |
| Alguien borró o cambió datos por error | Omar puede regresar la base a como estaba en cualquier momento de los últimos 7 días (ver abajo). |

**Restaurar la base (solo Omar):** D1 guarda un historial de 7 días.

```powershell
npx cf d1 time-travel restore 57eced06-ff9e-4e8f-9269-01a192a72432 --timestamp 2026-11-20T15:00:00Z
```

(Cambia la fecha y hora por un momento en que los datos estaban bien; la hora va en UTC = hora de México + 6 h.)

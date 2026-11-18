# Guía para el frontend · Pulso Financiero 3B

Para: **Alex** (líder front-end) y **Armando** (gráficas).
Todo lo que necesitas para conectar la página con el backend y la base de datos.

## 1. Lo esencial en 30 segundos

| Qué | Dónde |
|---|---|
| App publicada (página + API) | https://pulso-financiero-3b.1011estudio-ia.workers.dev |
| Lista de rutas de la API | https://pulso-financiero-3b.1011estudio-ia.workers.dev/api |
| Tu código | carpeta [`/frontend`](../../frontend) + [`index.html`](../../index.html) |
| Cliente de la API ya hecho (con tipos) | [`frontend/api.ts`](../../frontend/api.ts) |
| Stack | React 19 + Vite (TypeScript) |

La página y la API viven **en la misma URL**: desde React solo llamas `fetch("/api/kpis")`. No hay que configurar CORS ni URLs.

## 2. Correr el proyecto en tu computadora (primera vez)

Necesitas Node.js 22 o 24, Git y Python 3.

```powershell
git clone https://github.com/brandon-informatico/Ejemplo-Hackaton3B.git
cd Ejemplo-Hackaton3B
npm install
```

Crea la base de datos local y cárgale los datos de práctica (solo la primera vez):

```powershell
npm run db:migrar:local
```

```powershell
Set-Content .dev.vars "ADMIN_TOKEN=clave-local-de-prueba"
```

```powershell
npm run dev
```

Con el servidor corriendo, en **otra terminal**:

```powershell
npm run datos:cargar:local
```

Abre http://localhost:5173. Cada vez que guardes un archivo de `/frontend`, la página se actualiza sola.

> ¿No quieres base local? Crea `.env.local` con `VITE_API_URL=https://pulso-financiero-3b.1011estudio-ia.workers.dev` y tu página local usará la API de la nube (cuidado: así gastas el límite gratis diario de lecturas).

## 3. Cómo pedir datos desde React

```tsx
import { useEffect, useState } from "react";
import { api, pesos, type Kpis } from "./api";

export function Tarjetas({ region, desde, hasta }: { region?: string; desde?: string; hasta?: string }) {
	const [kpis, setKpis] = useState<Kpis | null>(null);
	useEffect(() => {
		api.kpis({ region, desde, hasta }).then(setKpis);
	}, [region, desde, hasta]);
	if (!kpis) return <p>Cargando…</p>;
	return <h2>Ventas: {pesos(kpis.ventas)}</h2>;
}
```

Todas las funciones de `api` regresan datos ya tipados. Si la API responde con error, lanzan `ErrorDeApi` con el mensaje en español.

## 4. Convenciones (iguales en todas las rutas)

- **Montos**: pesos MXN con 2 decimales (`420000.5` = $420,000.50). Usa `pesos(n)` para mostrarlos.
- **Porcentajes**: número con 2 decimales (`2.04` = 2.04%). Si no se puede calcular, viene `null`.
- **Fechas**: `AAAA-MM-DD`. **Meses**: `AAAA-MM`.
- **Filtros comunes** (todos opcionales):
  - `region` = `Centro`, `Norte`, `Sur`, `Occidente`, `Bajío` (los valores exactos salen de `/api/filtros`)
  - `tienda` = `T01` … `T30`
  - `desde` y `hasta` = `2026-05` o `2026-05-01`
  - `periodo` = `2026-10` (atajo para un solo mes)
- **Listas** siempre vienen así: `{ "filtros": {...}, "total": 12, "datos": [ ... ] }`
- **Errores** siempre vienen así: `{ "error": "mensaje en español" }` con código 400, 401, 404 o 500.
- Las rutas marcadas **MAQUETA** devuelven `"maqueta": true`: tienen la forma final, pero datos de ejemplo. Construye tu pantalla con ellas; cuando el motor real esté listo, solo cambian los números.

## 5. Rutas de la API

| Ruta | Para qué pantalla | Estado |
|---|---|---|
| `GET /api/salud` | indicador "en línea" | real |
| `GET /api/filtros` | llenar selectores (regiones, formatos, meses, categorías) | real |
| `GET /api/tiendas?region=&formato=` | lista de tiendas (`nueva: true` = abrió dentro del periodo) | real |
| `GET /api/tiendas/T08` | detalle de una tienda | real |
| `GET /api/kpis?region=&tienda=&desde=&hasta=` | **las 4 tarjetas** | real (Patrick valida) |
| `GET /api/ventas?...&agrupar=dia\|semana\|mes&por_tienda=1` | gráfica venta POS vs depósito | real |
| `GET /api/gastos?...&categoria=luz&por_tienda=1` | gráfica de gastos por categoría | real |
| `GET /api/productos` | catálogo de productos | real |
| `GET /api/productos/top?...&limite=10&orden=venta\|unidades\|margen` | productos con más demanda | real |
| `GET /api/alertas?region=&severidad=` | **panel de alertas** | MAQUETA |
| `GET /api/proyecciones/T21?venta_inicial=&crecimiento=&margen=&gastos_fijos=&meses=` | **curva de tienda nueva** | MAQUETA (fórmula real del reto) |
| `GET /api/ai/resumen-ejecutivo` | resumen de IA (3 viñetas) | MAQUETA |
| `POST /api/ai/preguntar` `{ "pregunta": "..." }` | buscador "Pregúntale al tablero" | MAQUETA |

### Ejemplo: `GET /api/kpis?region=Sur&periodo=2026-10`

```json
{
  "filtros": { "region": "Sur", "tienda": null, "desde": "2026-10", "hasta": "2026-10" },
  "tiendas": 6,
  "ventas": 14062766.92,
  "tickets": 92826,
  "ticket_promedio": 151.5,
  "costo_ventas": 11642601.18,
  "utilidad_bruta": 2420165.74,
  "margen_bruto_pct": 17.21,
  "gastos_operativos": 1586203.21,
  "gastos_por_categoria": { "luz": 170561.59, "mantenimiento": 53259.36, "merma": 129697.11, "nomina": 924561.91, "renta": 308123.24 },
  "utilidad_operativa": 833962.53,
  "margen_operativo_pct": 5.93,
  "depositos": 14050646.43,
  "diferencia_efectivo": 12120.49,
  "diferencia_efectivo_pct": 0.09,
  "dias_sin_deposito": 0,
  "auditoria": { "venta_pos": 14062766.92, "venta_desglose_productos": 14062766.92, "cuadra": true }
}
```

Las 4 tarjetas del reto: **Ventas** = `ventas` · **Gastos** = `gastos_operativos` · **Margen neto** = `utilidad_operativa` (y `margen_operativo_pct`) · **Diferencia de efectivo** = `diferencia_efectivo`.
`auditoria.cuadra` debe ser siempre `true`: es la prueba de que los números cuadran al centavo (puedes mostrar una palomita ✔ en la demo).

### Ejemplo: `GET /api/ventas?tienda=T08&desde=2026-10-12&hasta=2026-10-25&agrupar=semana`

```json
{
  "datos": [
    { "periodo": "2026-10-12", "venta_pos": 633347.65, "depositado": 633356.18, "diferencia": -8.53, "diferencia_pct": 0, "tickets": 4384, "ticket_promedio": 144.47, "dias_con_venta": 7, "dias_sin_deposito": 0 },
    { "periodo": "2026-10-19", "venta_pos": 602119.46, "depositado": 590077.07, "diferencia": 12042.39, "diferencia_pct": 2, "tickets": 4127, "ticket_promedio": 145.9, "dias_con_venta": 7, "dias_sin_deposito": 0 }
  ]
}
```

Con `agrupar=semana`, `periodo` es el lunes de esa semana.

### Ejemplo: una alerta (`GET /api/alertas`)

```json
{
  "id": "A-0001", "tienda_id": "T08", "tienda": "Tienda 08", "region": "Sur",
  "regla": "venta_vs_deposito", "severidad": "critica",
  "periodo": { "desde": "2026-10-19", "hasta": "2026-10-25" },
  "cifras": { "valor": 420000, "referencia": 411500, "etiqueta_valor": "Venta POS", "etiqueta_referencia": "Depositado" },
  "desviacion": { "monto": 8500, "pct": 2.0 },
  "explicacion": "La venta POS de la semana fue $420,000 pero el banco solo confirmó $411,500: faltan $8,500 (2.0%).",
  "accion_sugerida": "Auditar cortes de caja, fichas de depósito y arqueos de los últimos 5 días."
}
```

`severidad` es `critica` (rojo), `alta` (ámbar) o `media` (amarillo).

Los tipos completos de cada respuesta están en [`frontend/api.ts`](../../frontend/api.ts).

## 6. Publicar tus cambios en la nube

1. Trabaja en tu rama: `git checkout -b alex/tablero`.
2. Sube tu rama a GitHub y pide revisión a Omar.
3. Armando u Omar publican con `npm run deploy:nube` (solo quien tiene acceso a la cuenta de Cloudflare y la clave `.dev.vars.nube`).

## 7. Si algo falla

| Síntoma | Solución |
|---|---|
| `No se pudo conectar con la API` en local | ¿Está corriendo `npm run dev`? |
| `/api/salud` dice "sin tablas" | Corre `npm run db:migrar:local` y luego `npm run datos:cargar:local` |
| Todo en ceros | No hay datos: `npm run datos:cargar:local` |
| La respuesta trae `x-cache: HIT` y no ves un cambio | La API guarda respuestas 30 s. Agrega `&fresco=1` a la URL |
| Error 401 | Solo las rutas `/api/admin/*` piden clave; el tablero no las usa |

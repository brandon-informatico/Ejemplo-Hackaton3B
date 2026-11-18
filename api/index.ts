/**
 * PUNTO DE ENTRADA DEL BACKEND (Cloudflare Worker + Hono).
 * Todas las rutas viven bajo /api. La página web la sirve Cloudflare directamente.
 *
 * Mapa de archivos:
 *   rutas/datos.ts    catálogos y series (tiendas, ventas, gastos, productos)
 *   rutas/kpis.ts     tarjetas del tablero
 *   rutas/maqueta.ts  alertas, proyecciones e IA de ejemplo (temporales)
 *   rutas/admin.ts    carga de CSV (requiere clave)
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { cacheGet } from "./cache.ts";
import { ErrorApi } from "./lib.ts";
import { rutasAdmin } from "./rutas/admin.ts";
import { rutasDatos } from "./rutas/datos.ts";
import { rutasKpis } from "./rutas/kpis.ts";
import { rutasMaqueta } from "./rutas/maqueta.ts";

const app = new Hono().basePath("/api");

// CORS abierto: permite que una página en otra URL (ej. localhost de Alex) consuma la API.
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"] }));
app.use("*", cacheGet);

app.get("/", (c) =>
	c.json({
		nombre: "API Pulso Financiero 3B",
		version: "0.1.0",
		documentacion: "https://github.com/brandon-informatico/Ejemplo-Hackaton3B/tree/main/docs/frontend",
		convenciones: {
			montos: "pesos MXN con 2 decimales (la base guarda centavos)",
			fechas: "AAAA-MM-DD; meses AAAA-MM",
			filtros_comunes: "?region=Sur&tienda=T08&desde=2026-05&hasta=2026-10 (o ?periodo=2026-10)",
		},
		rutas: {
			"GET /api/salud": "estado de la API y filas por tabla",
			"GET /api/filtros": "valores para los selectores (regiones, formatos, meses, categorías)",
			"GET /api/tiendas": "catálogo de tiendas (?region=&formato=)",
			"GET /api/tiendas/:id": "una tienda",
			"GET /api/kpis": "tarjetas: ventas, gastos, margen, diferencia de efectivo",
			"GET /api/ventas": "venta POS vs depósito (?agrupar=dia|semana|mes&por_tienda=1)",
			"GET /api/gastos": "gasto por categoría y mes (?categoria=&por_tienda=1)",
			"GET /api/productos": "catálogo de productos",
			"GET /api/productos/top": "productos más vendidos (?limite=10&orden=venta|unidades|margen)",
			"GET /api/alertas": "MAQUETA · alertas priorizadas",
			"GET /api/proyecciones/:tienda": "MAQUETA · curva de flujo y punto de equilibrio",
			"GET /api/ai/resumen-ejecutivo": "MAQUETA · resumen en 3 viñetas",
			"POST /api/ai/preguntar": "MAQUETA · preguntas en lenguaje natural",
			"POST /api/admin/cargar": "carga de CSV (requiere clave)",
		},
	}),
);

app.route("/", rutasDatos);
app.route("/", rutasKpis);
app.route("/", rutasMaqueta);
app.route("/admin", rutasAdmin);

app.notFound((c) => c.json({ error: `No existe ${c.req.method} ${c.req.path}. Consulta GET /api para ver las rutas.` }, 404));

app.onError((err, c) => {
	if (err instanceof ErrorApi) return c.json({ error: err.message }, err.status as ContentfulStatusCode);
	console.error("Error no controlado:", err);
	return c.json({ error: "Error interno del servidor", detalle: String(err) }, 500);
});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler;

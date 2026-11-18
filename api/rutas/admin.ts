/**
 * Rutas de ADMINISTRACIÓN: carga de CSV a la base. Requieren la clave ADMIN_TOKEN:
 *   Authorization: Bearer <ADMIN_TOKEN>
 *
 * POST /api/admin/cargar?tabla=ventas_pos&modo=agregar|reemplazar&origen=archivo.csv
 *      Cuerpo: el texto del CSV (con encabezado). Máximo 5,000 filas por petición.
 *      - agregar:    inserta; si la llave ya existe, la actualiza (no duplica).
 *      - reemplazar: borra la tabla y luego inserta.
 * POST /api/admin/vaciar?tabla=ventas_pos   → borra todas las filas de una tabla.
 *
 * El script data/cargar_datos.py hace todo esto por ti, en el orden correcto.
 * Responsable: Omar (ingesta de datos).
 */
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { limpiarCache } from "../cache.ts";
import { TABLAS, validarCsv } from "../csv.ts";
import { ErrorApi } from "../lib.ts";

export const rutasAdmin = new Hono();
const MAX_FILAS = 5000;

/** Compara la clave en tiempo constante (evita adivinarla midiendo tiempos). */
async function claveValida(recibida: string | undefined): Promise<boolean> {
	const esperada = env.ADMIN_TOKEN;
	if (!esperada || !recibida) return false;
	const enc = new TextEncoder();
	const [a, b] = await Promise.all([
		crypto.subtle.digest("SHA-256", enc.encode(recibida)),
		crypto.subtle.digest("SHA-256", enc.encode(esperada)),
	]);
	// Ambos resúmenes miden 32 bytes: se recorren completos sin salir antes.
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	let diferencia = 0;
	for (let i = 0; i < x.length; i++) diferencia |= x[i] ^ y[i];
	return diferencia === 0;
}

rutasAdmin.use("*", async (c, next) => {
	const auth = c.req.header("authorization");
	const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;
	if (!(await claveValida(token))) throw new ErrorApi(401, "Falta o es incorrecta la clave de administrador (Authorization: Bearer ...)");
	await next();
});

function tablaValida(tabla: string | undefined): string {
	if (!tabla || !TABLAS[tabla]) {
		throw new ErrorApi(400, `Indica ?tabla= con una de: ${Object.keys(TABLAS).join(", ")}`);
	}
	return tabla;
}

rutasAdmin.post("/cargar", async (c) => {
	const tabla = tablaValida(c.req.query("tabla"));
	const modo = c.req.query("modo") ?? "agregar";
	if (modo !== "agregar" && modo !== "reemplazar") throw new ErrorApi(400, "modo debe ser agregar o reemplazar");
	const origen = (c.req.query("origen") ?? "api").slice(0, 200);

	const { filas, errores } = validarCsv(tabla, await c.req.text());
	if (errores.length) return c.json({ ok: false, tabla, errores }, 400);
	if (filas.length > MAX_FILAS) throw new ErrorApi(413, `Máximo ${MAX_FILAS} filas por petición; divide el archivo.`);

	const columnas = TABLAS[tabla];
	// Una sola sentencia inserta todas las filas: se mandan como JSON y SQLite las separa con json_each.
	const insert = env.DB.prepare(
		`INSERT OR REPLACE INTO ${tabla} (${columnas.map((col) => col.db).join(", ")})
		 SELECT ${columnas.map((_, i) => `json_extract(value, '$[${i}]')`).join(", ")}
		 FROM json_each(?1)`,
	).bind(JSON.stringify(filas));
	const bitacora = env.DB.prepare(
		"INSERT INTO bitacora_cargas (tabla, modo, filas, origen) VALUES (?1, ?2, ?3, ?4)",
	).bind(tabla, modo, filas.length, origen);

	const sentencias = modo === "reemplazar" ? [env.DB.prepare(`DELETE FROM ${tabla}`), insert, bitacora] : [insert, bitacora];
	try {
		// batch = transacción: o entra todo o no entra nada.
		const resultados = await env.DB.batch(sentencias);
		limpiarCache();
		const escritas = resultados.reduce((s, r) => s + (r.meta.rows_written ?? 0), 0);
		return c.json({ ok: true, tabla, modo, filas_cargadas: filas.length, filas_escritas_d1: escritas });
	} catch (e) {
		const msg = String(e);
		const pista = msg.includes("FOREIGN KEY")
			? " (una fila hace referencia a una tienda, producto o categoría que no existe; carga primero los catálogos)"
			: "";
		throw new ErrorApi(400, `La base rechazó la carga: ${msg}${pista}`);
	}
});

rutasAdmin.post("/vaciar", async (c) => {
	const tabla = tablaValida(c.req.query("tabla"));
	try {
		const r = await env.DB.prepare(`DELETE FROM ${tabla}`).run();
		limpiarCache();
		return c.json({ ok: true, tabla, filas_borradas: r.meta.changes });
	} catch (e) {
		throw new ErrorApi(400, `No se pudo vaciar ${tabla}: ${String(e)} (vacía primero las tablas que dependen de ella)`);
	}
});

rutasAdmin.get("/bitacora", async (c) => {
	const r = await env.DB.prepare("SELECT * FROM bitacora_cargas ORDER BY id DESC LIMIT 50").all();
	return c.json({ total: r.results.length, datos: r.results });
});

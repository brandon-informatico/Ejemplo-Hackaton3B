/**
 * Caché corta en memoria para respuestas GET.
 *
 * ¿Por qué? El plan gratis de D1 permite 5 millones de filas leídas al día. Si el
 * tablero se recarga muchas veces (5 personas desarrollando + jurado), la caché
 * evita repetir la misma consulta durante 30 segundos.
 *
 * - Agrega ?fresco=1 a cualquier URL para saltarte la caché.
 * - Cada carga de CSV limpia la caché.
 * - La respuesta trae el encabezado x-cache: HIT (de caché) o MISS (de la base).
 */
import type { MiddlewareHandler } from "hono";

const SEGUNDOS = 30;
const MAX_ENTRADAS = 300;
const cache = new Map<string, { expira: number; cuerpo: string; status: number }>();

export function limpiarCache(): void {
	cache.clear();
}

export const cacheGet: MiddlewareHandler = async (c, next) => {
	const url = new URL(c.req.url);
	if (c.req.method !== "GET" || url.pathname.startsWith("/api/admin") || url.searchParams.has("fresco")) {
		await next();
		return;
	}
	const clave = url.pathname + url.search;
	const guardado = cache.get(clave);
	if (guardado && guardado.expira > Date.now()) {
		return new Response(guardado.cuerpo, {
			status: guardado.status,
			headers: {
				"content-type": "application/json; charset=UTF-8",
				"x-cache": "HIT",
				"access-control-allow-origin": "*",
			},
		});
	}
	await next();
	if (c.res.status === 200 && c.res.headers.get("content-type")?.includes("application/json")) {
		const cuerpo = await c.res.clone().text();
		if (cache.size >= MAX_ENTRADAS) cache.delete(cache.keys().next().value as string);
		cache.set(clave, { expira: Date.now() + SEGUNDOS * 1000, cuerpo, status: 200 });
	}
	c.res.headers.set("x-cache", "MISS");
};

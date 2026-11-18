/**
 * Utilidades compartidas del backend: conexión a D1, filtros, conversión de montos.
 */
import { env } from "cloudflare:workers";

/** Error con código HTTP que la API devuelve como { error: "..." }. */
export class ErrorApi extends Error {
	constructor(
		public status: 400 | 401 | 404 | 413 | 500 | 503,
		mensaje: string,
	) {
		super(mensaje);
	}
}

/** Ejecuta una consulta SELECT y devuelve las filas. */
export async function consultar<T = Record<string, unknown>>(
	sql: string,
	...params: unknown[]
): Promise<T[]> {
	const r = await env.DB.prepare(sql)
		.bind(...params)
		.all<T>();
	return r.results;
}

/** Ejecuta una consulta que devuelve una sola fila. */
export async function consultarUna<T = Record<string, unknown>>(
	sql: string,
	...params: unknown[]
): Promise<T | null> {
	return env.DB.prepare(sql)
		.bind(...params)
		.first<T>();
}

/** Centavos (entero) → pesos con 2 decimales. */
export function aPesos(centavos: number | null | undefined): number {
	return Math.round(Number(centavos ?? 0)) / 100;
}

/** Porcentaje con 2 decimales; null si el denominador es 0. */
export function porcentaje(parte: number, total: number): number | null {
	if (!total) return null;
	return Math.round((parte / total) * 10000) / 100;
}

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const RE_MES = /^\d{4}-\d{2}$/;

export type Filtros = {
	region: string | null;
	tienda: string | null;
	/** Rango para tablas diarias (ventas_pos, depositos): 'AAAA-MM-DD'. */
	desdeDia: string;
	hastaDia: string;
	/** Rango para tablas mensuales (gastos, ventas_producto): 'AAAA-MM'. */
	desdeMes: string;
	hastaMes: string;
	/** Lo que se reporta en la respuesta (null = todo el periodo disponible). */
	periodo: { desde: string | null; hasta: string | null };
};

function texto(v: string | undefined): string | null {
	const t = v?.trim();
	return t ? t : null;
}

/**
 * Lee los filtros comunes de la URL:
 *   ?region=Sur&tienda=T08&desde=2026-05&hasta=2026-10   (meses)
 *   ?desde=2026-10-01&hasta=2026-10-07                    (días, solo tablas diarias)
 *   ?periodo=2026-10                                      (atajo: un solo mes)
 * Con soloMeses=true, los días se redondean al mes completo (lo usan los KPIs para que todo cuadre).
 */
export function leerFiltros(q: (k: string) => string | undefined, soloMeses = false): Filtros {
	const region = texto(q("region"));
	const tienda = texto(q("tienda"))?.toUpperCase() ?? null;
	let desde = texto(q("desde"));
	let hasta = texto(q("hasta"));
	const periodo = texto(q("periodo"));
	if (periodo) {
		if (!RE_MES.test(periodo)) throw new ErrorApi(400, "periodo debe tener formato AAAA-MM, ej. 2026-10");
		desde = periodo;
		hasta = periodo;
	}
	for (const [nombre, valor] of [
		["desde", desde],
		["hasta", hasta],
	] as const) {
		if (valor && !RE_DIA.test(valor) && !RE_MES.test(valor)) {
			throw new ErrorApi(400, `${nombre} debe tener formato AAAA-MM o AAAA-MM-DD (recibí "${valor}")`);
		}
	}
	if (soloMeses) {
		desde = desde?.slice(0, 7) ?? null;
		hasta = hasta?.slice(0, 7) ?? null;
	}
	const desdeDia = !desde ? "0000-01-01" : desde.length === 7 ? `${desde}-01` : desde;
	const hastaDia = !hasta ? "9999-12-31" : hasta.length === 7 ? `${hasta}-31` : hasta;
	if (desdeDia > hastaDia) throw new ErrorApi(400, "desde no puede ser posterior a hasta");
	return {
		region,
		tienda,
		desdeDia,
		hastaDia,
		desdeMes: desdeDia.slice(0, 7),
		hastaMes: hastaDia.slice(0, 7),
		periodo: { desde, hasta },
	};
}

/** Lee un entero de la URL con mínimo, máximo y valor por defecto. */
export function leerEntero(valor: string | undefined, defecto: number, min: number, max: number): number {
	if (valor === undefined || valor === "") return defecto;
	const n = Number(valor);
	if (!Number.isInteger(n) || n < min || n > max) {
		throw new ErrorApi(400, `valor inválido "${valor}": debe ser entero entre ${min} y ${max}`);
	}
	return n;
}

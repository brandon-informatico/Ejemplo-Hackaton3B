/**
 * RUTAS DE MAQUETA (temporales). Devuelven ejemplos con la forma final del contrato
 * para que el frontend pueda construir sus pantallas YA, mientras el equipo programa
 * el motor real. Todas traen "maqueta": true. Cuando el motor real exista, se
 * reemplaza este archivo y el frontend no cambia nada.
 *
 *   /api/alertas                → Alejandro (reglas) + Armando (acciones)
 *   /api/proyecciones/:tienda   → Alejandro (proyección)
 *   /api/ai/*                   → Omar (IA)
 */
import { Hono } from "hono";
import { ErrorApi } from "../lib.ts";

export const rutasMaqueta = new Hono();

const NOTA = "MAQUETA: datos de ejemplo del documento del reto. Se reemplaza por el motor real.";

rutasMaqueta.get("/alertas", (c) =>
	c.json({
		maqueta: true,
		nota: NOTA,
		filtros: { region: c.req.query("region") ?? null, severidad: c.req.query("severidad") ?? null },
		total: 3,
		datos: [
			{
				id: "A-0001",
				tienda_id: "T08",
				tienda: "Tienda 08",
				region: "Sur",
				regla: "venta_vs_deposito",
				regla_descripcion: "Diferencia acumulada de la semana mayor a 0.5% de la venta (crítica si además supera $5,000)",
				severidad: "critica",
				periodo: { desde: "2026-10-19", hasta: "2026-10-25" },
				cifras: { valor: 420000, referencia: 411500, etiqueta_valor: "Venta POS", etiqueta_referencia: "Depositado" },
				desviacion: { monto: 8500, pct: 2.0 },
				explicacion: "La venta POS de la semana fue $420,000 pero el banco solo confirmó $411,500: faltan $8,500 (2.0%).",
				accion_sugerida: "Auditar cortes de caja, fichas de depósito y arqueos de los últimos 5 días.",
			},
			{
				id: "A-0002",
				tienda_id: "T12",
				tienda: "Tienda 12",
				region: "Norte",
				regla: "gasto_atipico",
				regla_descripcion: "Gasto de la categoría 25% arriba de su promedio de 3 meses y de la mediana de tiendas similares",
				severidad: "alta",
				periodo: { desde: "2026-10", hasta: "2026-10" },
				cifras: { valor: 14200, referencia: 10600, etiqueta_valor: "Luz del mes", etiqueta_referencia: "Promedio 3 meses" },
				desviacion: { monto: 3600, pct: 34.0 },
				explicacion: "La luz costó $14,200 contra un promedio de $10,600 en los últimos 3 meses (+34%).",
				accion_sugerida: "Revisar recibo y equipos de refrigeración; comparar con tiendas del mismo formato.",
			},
			{
				id: "A-0003",
				tienda_id: "T21",
				tienda: "Tienda 21",
				region: "Sur",
				regla: "venta_vs_proyeccion",
				regla_descripcion: "Tienda nueva con venta real 10% o más por debajo de su proyección",
				severidad: "media",
				periodo: { desde: "2026-10", hasta: "2026-10" },
				cifras: { valor: 450000, referencia: 500000, etiqueta_valor: "Venta real", etiqueta_referencia: "Proyectada" },
				desviacion: { monto: -50000, pct: -10.0 },
				explicacion: "La tienda nueva vendió $450,000 contra $500,000 proyectados (−10%).",
				accion_sugerida: "Revisar surtido y horario; actualizar proyección de punto de equilibrio.",
			},
		],
	}),
);

/**
 * GET /api/proyecciones/:tienda?venta_inicial=&crecimiento=&margen=&gastos_fijos=&meses=
 * Fórmula del reto: venta(m) = venta_inicial × (1 + crecimiento)^(m−1); resultado = venta × margen − gastos_fijos.
 * Los supuestos se pueden cambiar por URL (la pantalla puede tener controles para editarlos).
 */
rutasMaqueta.get("/proyecciones/:tienda", (c) => {
	const num = (k: string, d: number) => {
		const v = c.req.query(k);
		if (v === undefined) return d;
		const n = Number(v);
		if (!Number.isFinite(n)) throw new ErrorApi(400, `${k} debe ser numérico`);
		return n;
	};
	const supuestos = {
		venta_inicial: num("venta_inicial", 500000),
		crecimiento_mensual: num("crecimiento", 0.1),
		margen_bruto: num("margen", 0.2),
		gastos_fijos: num("gastos_fijos", 150000),
	};
	const meses = Math.min(Math.max(Math.trunc(num("meses", 12)), 1), 36);
	let acumulado = 0;
	let equilibrioMensual: number | null = null;
	let recuperacion: number | null = null;
	const curva = Array.from({ length: meses }, (_, i) => {
		const mes = i + 1;
		const venta = Math.round(supuestos.venta_inicial * (1 + supuestos.crecimiento_mensual) ** i * 100) / 100;
		const resultado = Math.round((venta * supuestos.margen_bruto - supuestos.gastos_fijos) * 100) / 100;
		acumulado = Math.round((acumulado + resultado) * 100) / 100;
		if (equilibrioMensual === null && resultado > 0) equilibrioMensual = mes;
		if (recuperacion === null && acumulado > 0) recuperacion = mes;
		return { mes, venta, resultado, acumulado };
	});
	return c.json({
		maqueta: true,
		nota: "MAQUETA: usa los supuestos del documento del reto, todavía no los datos reales de la tienda.",
		tienda_id: c.req.param("tienda").toUpperCase(),
		supuestos,
		mes_punto_equilibrio: equilibrioMensual,
		mes_recuperacion_acumulada: recuperacion,
		curva,
	});
});

rutasMaqueta.get("/ai/resumen-ejecutivo", (c) =>
	c.json({
		maqueta: true,
		nota: NOTA,
		vinetas: [
			"La Región Sur concentra la mayoría de las desviaciones de efectivo; prioridad: Tienda 08 por faltante de $8,500 entre POS y banco.",
			"La luz de la Tienda 12 (Norte) subió 34% contra su promedio; revisar refrigeración.",
			"La Tienda 21 (nueva) vende 10% menos de lo proyectado; su punto de equilibrio se retrasa.",
		],
		fuentes: ["/api/alertas", "/api/kpis"],
	}),
);

rutasMaqueta.post("/ai/preguntar", async (c) => {
	const cuerpo = await c.req.json<{ pregunta?: string }>().catch(() => ({}) as { pregunta?: string });
	if (!cuerpo.pregunta?.trim()) throw new ErrorApi(400, 'Envía JSON: { "pregunta": "..." }');
	return c.json({
		maqueta: true,
		nota: NOTA,
		pregunta: cuerpo.pregunta,
		respuesta: "Ejemplo: las tiendas nuevas que tardan más de 5 meses en ser rentables son T21 y T27.",
		filtros_sugeridos: { tienda: ["T21", "T27"] },
		fuentes: ["/api/proyecciones/T21", "/api/proyecciones/T27"],
	});
});

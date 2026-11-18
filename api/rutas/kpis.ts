/**
 * GET /api/kpis — las 4 tarjetas del tablero: ventas, gastos, margen y diferencia de efectivo.
 *
 * VERSIÓN INICIAL (infraestructura). Patrick (conciliación y rigor contable) debe
 * revisar y validar las definiciones antes de la demo.
 *
 * Definiciones:
 *   ventas              = suma de venta POS del periodo
 *   costo_ventas        = costo de la mercancía vendida (desglose por producto)
 *   utilidad_bruta      = ventas − costo_ventas
 *   gastos_operativos   = renta + luz + nómina + mantenimiento + merma
 *   utilidad_operativa  = utilidad_bruta − gastos_operativos   (la tarjeta "margen neto")
 *   diferencia_efectivo = ventas − depósitos confirmados por el banco
 *
 * El periodo siempre se toma en MESES COMPLETOS (desde/hasta = AAAA-MM) para que
 * ventas diarias, gastos mensuales y costos mensuales cubran exactamente lo mismo.
 */
import { Hono } from "hono";
import { aPesos, consultar, consultarUna, leerFiltros, porcentaje } from "../lib.ts";

export const rutasKpis = new Hono();

rutasKpis.get("/kpis", async (c) => {
	const f = leerFiltros((k) => c.req.query(k), true);
	const params = [f.region, f.tienda] as const;
	const desdeDia = `${f.desdeMes}-01`;
	const hastaDia = `${f.hastaMes}-31`;

	const [venta, costo, gastos] = await Promise.all([
		consultarUna<{ tiendas: number; venta: number | null; depositado: number | null; tickets: number | null; dias_sin_deposito: number | null }>(
			`SELECT COUNT(DISTINCT v.tienda_id) AS tiendas,
				SUM(v.venta_centavos) AS venta,
				SUM(COALESCE(d.monto_centavos, 0)) AS depositado,
				SUM(v.tickets) AS tickets,
				SUM(CASE WHEN d.tienda_id IS NULL THEN 1 ELSE 0 END) AS dias_sin_deposito
			 FROM ventas_pos v
			 JOIN tiendas t ON t.tienda_id = v.tienda_id
			 LEFT JOIN depositos d ON d.fecha_venta = v.fecha AND d.tienda_id = v.tienda_id
			 WHERE v.fecha BETWEEN ?3 AND ?4
			   AND (?1 IS NULL OR t.region = ?1) AND (?2 IS NULL OR v.tienda_id = ?2)`,
			...params,
			desdeDia,
			hastaDia,
		),
		consultarUna<{ venta: number | null; costo: number | null }>(
			`SELECT SUM(p.venta_centavos) AS venta, SUM(p.costo_centavos) AS costo
			 FROM ventas_producto p
			 JOIN tiendas t ON t.tienda_id = p.tienda_id
			 WHERE p.mes BETWEEN ?3 AND ?4
			   AND (?1 IS NULL OR t.region = ?1) AND (?2 IS NULL OR p.tienda_id = ?2)`,
			...params,
			f.desdeMes,
			f.hastaMes,
		),
		consultar<{ categoria: string; monto: number }>(
			`SELECT g.categoria, SUM(g.monto_centavos) AS monto
			 FROM gastos g
			 JOIN tiendas t ON t.tienda_id = g.tienda_id
			 WHERE g.mes BETWEEN ?3 AND ?4
			   AND (?1 IS NULL OR t.region = ?1) AND (?2 IS NULL OR g.tienda_id = ?2)
			 GROUP BY g.categoria ORDER BY g.categoria`,
			...params,
			f.desdeMes,
			f.hastaMes,
		),
	]);

	// Todo se suma en centavos (enteros) y se convierte a pesos al final.
	const ventas = venta?.venta ?? 0;
	const depositado = venta?.depositado ?? 0;
	const costoVentas = costo?.costo ?? 0;
	const gastosTotal = gastos.reduce((s, g) => s + g.monto, 0);
	const utilidadBruta = ventas - costoVentas;
	const utilidadOperativa = utilidadBruta - gastosTotal;
	const diferencia = ventas - depositado;

	return c.json({
		filtros: { region: f.region, tienda: f.tienda, desde: f.periodo.desde, hasta: f.periodo.hasta },
		tiendas: venta?.tiendas ?? 0,
		ventas: aPesos(ventas),
		tickets: venta?.tickets ?? 0,
		ticket_promedio: venta?.tickets ? aPesos(ventas / venta.tickets) : null,
		costo_ventas: aPesos(costoVentas),
		utilidad_bruta: aPesos(utilidadBruta),
		margen_bruto_pct: porcentaje(utilidadBruta, ventas),
		gastos_operativos: aPesos(gastosTotal),
		gastos_por_categoria: Object.fromEntries(gastos.map((g) => [g.categoria, aPesos(g.monto)])),
		utilidad_operativa: aPesos(utilidadOperativa),
		margen_operativo_pct: porcentaje(utilidadOperativa, ventas),
		depositos: aPesos(depositado),
		diferencia_efectivo: aPesos(diferencia),
		diferencia_efectivo_pct: porcentaje(diferencia, ventas),
		dias_sin_deposito: venta?.dias_sin_deposito ?? 0,
		// Prueba de cuadre: la venta POS debe ser igual a la suma del desglose por producto.
		auditoria: {
			venta_pos: aPesos(ventas),
			venta_desglose_productos: aPesos(costo?.venta ?? 0),
			cuadra: ventas === (costo?.venta ?? 0),
		},
	});
});

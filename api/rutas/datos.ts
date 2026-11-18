/**
 * Rutas de DATOS: catálogos y series agregadas, directo de la base D1.
 * Responsable: Alejandro (API) con Omar (datos).
 */
import { Hono } from "hono";
import { ErrorApi, aPesos, consultar, consultarUna, leerEntero, leerFiltros, porcentaje } from "../lib.ts";

export const rutasDatos = new Hono();

/** GET /api/salud — ¿está viva la API y la base? Cuántas filas hay por tabla. */
rutasDatos.get("/salud", async (c) => {
	try {
		const filas = await consultarUna<Record<string, number>>(
			`SELECT
				(SELECT COUNT(*) FROM tiendas)         AS tiendas,
				(SELECT COUNT(*) FROM productos)       AS productos,
				(SELECT COUNT(*) FROM ventas_pos)      AS ventas_pos,
				(SELECT COUNT(*) FROM depositos)       AS depositos,
				(SELECT COUNT(*) FROM gastos)          AS gastos,
				(SELECT COUNT(*) FROM ventas_producto) AS ventas_producto`,
		);
		const rango = await consultarUna<{ desde: string | null; hasta: string | null }>(
			"SELECT MIN(fecha) AS desde, MAX(fecha) AS hasta FROM ventas_pos",
		);
		return c.json({ ok: true, base_de_datos: "conectada", filas, periodo_datos: rango });
	} catch (e) {
		return c.json(
			{ ok: false, base_de_datos: "sin tablas: corre las migraciones (ver docs/infra)", detalle: String(e) },
			503,
		);
	}
});

/** GET /api/filtros — valores para llenar los selectores del tablero. */
rutasDatos.get("/filtros", async (c) => {
	const [regiones, formatos, categorias, categoriasProducto, rango] = await Promise.all([
		consultar<{ region: string }>("SELECT DISTINCT region FROM tiendas ORDER BY region"),
		consultar<{ formato: string }>("SELECT DISTINCT formato FROM tiendas ORDER BY formato"),
		consultar("SELECT categoria, nombre, tipo FROM categorias_gasto ORDER BY categoria"),
		consultar<{ categoria: string }>("SELECT DISTINCT categoria FROM productos ORDER BY categoria"),
		consultarUna<{ desde: string | null; hasta: string | null }>(
			"SELECT MIN(fecha) AS desde, MAX(fecha) AS hasta FROM ventas_pos",
		),
	]);
	const meses: string[] = [];
	if (rango?.desde && rango.hasta) {
		let [a, m] = rango.desde.slice(0, 7).split("-").map(Number);
		const fin = rango.hasta.slice(0, 7);
		for (let s = rango.desde.slice(0, 7); s <= fin; ) {
			meses.push(s);
			m++;
			if (m > 12) {
				m = 1;
				a++;
			}
			s = `${a}-${String(m).padStart(2, "0")}`;
		}
	}
	return c.json({
		regiones: regiones.map((r) => r.region),
		formatos: formatos.map((r) => r.formato),
		categorias_gasto: categorias,
		categorias_producto: categoriasProducto.map((r) => r.categoria),
		periodo_datos: rango,
		meses,
	});
});

/** GET /api/tiendas?region=&formato= — catálogo de tiendas. */
rutasDatos.get("/tiendas", async (c) => {
	const region = c.req.query("region") || null;
	const formato = c.req.query("formato") || null;
	const filas = await consultar<Record<string, unknown> & { fecha_apertura: string }>(
		`SELECT t.*, (SELECT MIN(fecha) FROM ventas_pos) AS inicio_datos
		 FROM tiendas t
		 WHERE (?1 IS NULL OR t.region = ?1) AND (?2 IS NULL OR t.formato = ?2)
		 ORDER BY t.tienda_id`,
		region,
		formato,
	);
	const datos = filas.map(({ inicio_datos, ...t }) => ({
		...t,
		// "nueva" = abrió dentro del periodo con datos: candidata a proyección de rentabilidad
		nueva: typeof inicio_datos === "string" && t.fecha_apertura >= inicio_datos,
	}));
	return c.json({ filtros: { region, formato }, total: datos.length, datos });
});

/** GET /api/tiendas/:id — una tienda. */
rutasDatos.get("/tiendas/:id", async (c) => {
	const t = await consultarUna("SELECT * FROM tiendas WHERE tienda_id = ?1", c.req.param("id").toUpperCase());
	if (!t) throw new ErrorApi(404, `No existe la tienda ${c.req.param("id")}`);
	return c.json(t);
});

const AGRUPACIONES = {
	dia: "v.fecha",
	semana: "date(v.fecha, '-6 days', 'weekday 1')", // lunes de esa semana
	mes: "substr(v.fecha, 1, 7)",
} as const;

/**
 * GET /api/ventas?region=&tienda=&desde=&hasta=&agrupar=dia|semana|mes&por_tienda=1
 * Venta POS contra depósito bancario (base de la conciliación).
 */
rutasDatos.get("/ventas", async (c) => {
	const f = leerFiltros((k) => c.req.query(k));
	const agrupar = (c.req.query("agrupar") ?? "mes") as keyof typeof AGRUPACIONES;
	if (!(agrupar in AGRUPACIONES)) throw new ErrorApi(400, "agrupar debe ser dia, semana o mes");
	const porTienda = c.req.query("por_tienda") === "1";
	const periodo = AGRUPACIONES[agrupar];
	const filas = await consultar<{
		periodo: string;
		tienda_id?: string;
		venta: number;
		depositado: number;
		tickets: number;
		dias: number;
		dias_sin_deposito: number;
	}>(
		`SELECT ${periodo} AS periodo ${porTienda ? ", v.tienda_id" : ""},
			SUM(v.venta_centavos) AS venta,
			COALESCE(SUM(d.monto_centavos), 0) AS depositado,
			SUM(v.tickets) AS tickets,
			COUNT(*) AS dias,
			SUM(CASE WHEN d.tienda_id IS NULL THEN 1 ELSE 0 END) AS dias_sin_deposito
		 FROM ventas_pos v
		 JOIN tiendas t ON t.tienda_id = v.tienda_id
		 LEFT JOIN depositos d ON d.fecha_venta = v.fecha AND d.tienda_id = v.tienda_id
		 WHERE v.fecha BETWEEN ?1 AND ?2
		   AND (?3 IS NULL OR t.region = ?3)
		   AND (?4 IS NULL OR v.tienda_id = ?4)
		 GROUP BY periodo ${porTienda ? ", v.tienda_id" : ""}
		 ORDER BY periodo ${porTienda ? ", v.tienda_id" : ""}`,
		f.desdeDia,
		f.hastaDia,
		f.region,
		f.tienda,
	);
	return c.json({
		filtros: { region: f.region, tienda: f.tienda, ...f.periodo, agrupar, por_tienda: porTienda },
		total: filas.length,
		datos: filas.map((r) => ({
			periodo: r.periodo,
			...(porTienda ? { tienda_id: r.tienda_id } : {}),
			venta_pos: aPesos(r.venta),
			depositado: aPesos(r.depositado),
			diferencia: aPesos(r.venta - r.depositado),
			diferencia_pct: porcentaje(r.venta - r.depositado, r.venta),
			tickets: r.tickets,
			ticket_promedio: r.tickets ? aPesos(r.venta / r.tickets) : null,
			dias_con_venta: r.dias,
			dias_sin_deposito: r.dias_sin_deposito,
		})),
	});
});

/** GET /api/gastos?region=&tienda=&categoria=&desde=&hasta=&por_tienda=1 — gasto mensual por categoría. */
rutasDatos.get("/gastos", async (c) => {
	const f = leerFiltros((k) => c.req.query(k), true);
	const categoria = c.req.query("categoria") || null;
	const porTienda = c.req.query("por_tienda") === "1";
	const filas = await consultar<{ mes: string; tienda_id?: string; categoria: string; monto: number }>(
		`SELECT g.mes ${porTienda ? ", g.tienda_id" : ""}, g.categoria, SUM(g.monto_centavos) AS monto
		 FROM gastos g
		 JOIN tiendas t ON t.tienda_id = g.tienda_id
		 WHERE g.mes BETWEEN ?1 AND ?2
		   AND (?3 IS NULL OR t.region = ?3)
		   AND (?4 IS NULL OR g.tienda_id = ?4)
		   AND (?5 IS NULL OR g.categoria = ?5)
		 GROUP BY g.mes ${porTienda ? ", g.tienda_id" : ""}, g.categoria
		 ORDER BY g.mes ${porTienda ? ", g.tienda_id" : ""}, g.categoria`,
		f.desdeMes,
		f.hastaMes,
		f.region,
		f.tienda,
		categoria,
	);
	return c.json({
		filtros: { region: f.region, tienda: f.tienda, categoria, ...f.periodo, por_tienda: porTienda },
		total: filas.length,
		datos: filas.map((r) => ({ ...r, monto: aPesos(r.monto) })),
	});
});

/** GET /api/productos — catálogo de productos. */
rutasDatos.get("/productos", async (c) => {
	const filas = await consultar<{ precio_lista_centavos: number; costo_centavos: number } & Record<string, unknown>>(
		"SELECT * FROM productos ORDER BY producto_id",
	);
	const datos = filas.map(({ precio_lista_centavos, costo_centavos, ...p }) => ({
		...p,
		marca_propia: p.marca_propia === 1,
		precio_lista: aPesos(precio_lista_centavos),
		costo: aPesos(costo_centavos),
	}));
	return c.json({ total: datos.length, datos });
});

/**
 * GET /api/productos/top?region=&tienda=&categoria=&desde=&hasta=&limite=10&orden=venta|unidades|margen
 * Productos con más demanda en el periodo (meses completos).
 */
rutasDatos.get("/productos/top", async (c) => {
	const f = leerFiltros((k) => c.req.query(k), true);
	const limite = leerEntero(c.req.query("limite"), 10, 1, 200);
	const categoria = c.req.query("categoria") || null;
	const orden = c.req.query("orden") ?? "venta";
	const columnasOrden: Record<string, string> = {
		venta: "venta DESC",
		unidades: "unidades DESC",
		margen: "(venta - costo) DESC",
	};
	if (!columnasOrden[orden]) throw new ErrorApi(400, "orden debe ser venta, unidades o margen");
	const filas = await consultar<{
		producto_id: string;
		nombre: string;
		categoria: string;
		marca_propia: number;
		unidades: number;
		venta: number;
		costo: number;
	}>(
		`SELECT p.producto_id, pr.nombre, pr.categoria, pr.marca_propia,
			SUM(p.unidades) AS unidades, SUM(p.venta_centavos) AS venta, SUM(p.costo_centavos) AS costo
		 FROM ventas_producto p
		 JOIN tiendas t ON t.tienda_id = p.tienda_id
		 JOIN productos pr ON pr.producto_id = p.producto_id
		 WHERE p.mes BETWEEN ?1 AND ?2
		   AND (?3 IS NULL OR t.region = ?3)
		   AND (?4 IS NULL OR p.tienda_id = ?4)
		   AND (?5 IS NULL OR pr.categoria = ?5)
		 GROUP BY p.producto_id
		 ORDER BY ${columnasOrden[orden]}
		 LIMIT ?6`,
		f.desdeMes,
		f.hastaMes,
		f.region,
		f.tienda,
		categoria,
		limite,
	);
	return c.json({
		filtros: { region: f.region, tienda: f.tienda, categoria, ...f.periodo, orden, limite },
		total: filas.length,
		datos: filas.map((r, i) => ({
			lugar: i + 1,
			producto_id: r.producto_id,
			nombre: r.nombre,
			categoria: r.categoria,
			marca_propia: r.marca_propia === 1,
			unidades: r.unidades,
			venta: aPesos(r.venta),
			precio_promedio: r.unidades ? aPesos(r.venta / r.unidades) : null,
			margen_bruto_pct: porcentaje(r.venta - r.costo, r.venta),
		})),
	});
});

/**
 * Cliente de la API para el frontend. Úsalo así:
 *
 *   import { api } from "./api";
 *   const kpis = await api.kpis({ region: "Sur", desde: "2026-05", hasta: "2026-10" });
 *
 * La API vive en la misma URL que la página (/api/...), así que no hay que configurar nada.
 * Si quieres apuntar a otra URL (ej. la de la nube mientras corres la página en tu compu),
 * crea un archivo .env.local con:  VITE_API_URL=https://pulso-financiero-3b.<subdominio>.workers.dev
 */

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type Params = Record<string, string | number | boolean | undefined | null>;

export class ErrorDeApi extends Error {
	constructor(
		public status: number,
		mensaje: string,
	) {
		super(mensaje);
	}
}

async function pedir<T>(ruta: string, params: Params = {}, init?: RequestInit): Promise<T> {
	const url = new URL(`${BASE}/api${ruta}`, window.location.origin);
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
	}
	const res = await fetch(url, init);
	const cuerpo = await res.json().catch(() => ({}));
	if (!res.ok) throw new ErrorDeApi(res.status, (cuerpo as { error?: string }).error ?? `Error ${res.status}`);
	return cuerpo as T;
}

// ---------- Tipos (contrato con el backend; ver docs/frontend/README.md) ----------

export type FiltrosComunes = { region?: string; tienda?: string; desde?: string; hasta?: string; periodo?: string };
export type Lista<T> = { total: number; datos: T[]; filtros?: Record<string, unknown> };

export type Salud = {
	ok: boolean;
	base_de_datos: string;
	filas?: Record<string, number>;
	periodo_datos?: { desde: string | null; hasta: string | null };
};

export type Filtros = {
	regiones: string[];
	formatos: string[];
	categorias_gasto: { categoria: string; nombre: string; tipo: "fijo" | "variable" }[];
	categorias_producto: string[];
	periodo_datos: { desde: string | null; hasta: string | null };
	meses: string[];
};

export type Tienda = {
	tienda_id: string;
	nombre: string;
	region: string;
	ciudad: string;
	formato: string;
	fecha_apertura: string;
	m2: number;
	nueva: boolean;
};

export type Kpis = {
	tiendas: number;
	ventas: number;
	tickets: number;
	ticket_promedio: number | null;
	costo_ventas: number;
	utilidad_bruta: number;
	margen_bruto_pct: number | null;
	gastos_operativos: number;
	gastos_por_categoria: Record<string, number>;
	utilidad_operativa: number;
	margen_operativo_pct: number | null;
	depositos: number;
	diferencia_efectivo: number;
	diferencia_efectivo_pct: number | null;
	dias_sin_deposito: number;
	auditoria: { venta_pos: number; venta_desglose_productos: number; cuadra: boolean };
};

export type PuntoVentas = {
	periodo: string;
	tienda_id?: string;
	venta_pos: number;
	depositado: number;
	diferencia: number;
	diferencia_pct: number | null;
	tickets: number;
	ticket_promedio: number | null;
	dias_con_venta: number;
	dias_sin_deposito: number;
};

export type Gasto = { mes: string; tienda_id?: string; categoria: string; monto: number };

export type ProductoTop = {
	lugar: number;
	producto_id: string;
	nombre: string;
	categoria: string;
	marca_propia: boolean;
	unidades: number;
	venta: number;
	precio_promedio: number | null;
	margen_bruto_pct: number | null;
};

export type Alerta = {
	id: string;
	tienda_id: string;
	tienda: string;
	region: string;
	regla: string;
	regla_descripcion: string;
	severidad: "critica" | "alta" | "media";
	periodo: { desde: string; hasta: string };
	cifras: { valor: number; referencia: number; etiqueta_valor: string; etiqueta_referencia: string };
	desviacion: { monto: number; pct: number };
	explicacion: string;
	accion_sugerida: string;
};

export type Proyeccion = {
	tienda_id: string;
	supuestos: { venta_inicial: number; crecimiento_mensual: number; margen_bruto: number; gastos_fijos: number };
	mes_punto_equilibrio: number | null;
	mes_recuperacion_acumulada: number | null;
	curva: { mes: number; venta: number; resultado: number; acumulado: number }[];
};

// ---------- Funciones ----------

export const api = {
	salud: () => pedir<Salud>("/salud", { fresco: 1 }),
	filtros: () => pedir<Filtros>("/filtros"),
	tiendas: (p: { region?: string; formato?: string } = {}) => pedir<Lista<Tienda>>("/tiendas", p),
	kpis: (p: FiltrosComunes = {}) => pedir<Kpis>("/kpis", p),
	ventas: (p: FiltrosComunes & { agrupar?: "dia" | "semana" | "mes"; por_tienda?: 1 } = {}) =>
		pedir<Lista<PuntoVentas>>("/ventas", p),
	gastos: (p: FiltrosComunes & { categoria?: string; por_tienda?: 1 } = {}) => pedir<Lista<Gasto>>("/gastos", p),
	productosTop: (p: FiltrosComunes & { limite?: number; orden?: "venta" | "unidades" | "margen"; categoria?: string } = {}) =>
		pedir<Lista<ProductoTop>>("/productos/top", p),
	alertas: (p: { region?: string; severidad?: string } = {}) => pedir<Lista<Alerta> & { maqueta?: boolean }>("/alertas", p),
	proyeccion: (tienda: string, supuestos: Partial<Record<"venta_inicial" | "crecimiento" | "margen" | "gastos_fijos" | "meses", number>> = {}) =>
		pedir<Proyeccion & { maqueta?: boolean }>(`/proyecciones/${encodeURIComponent(tienda)}`, supuestos),
	resumenEjecutivo: () => pedir<{ vinetas: string[]; maqueta?: boolean }>("/ai/resumen-ejecutivo"),
	preguntar: (pregunta: string) =>
		pedir<{ respuesta: string; filtros_sugeridos?: Record<string, unknown>; maqueta?: boolean }>("/ai/preguntar", {}, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ pregunta }),
		}),
};

/** Formatea pesos: 420000.5 → "$420,000.50" */
export const pesos = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

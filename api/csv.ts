/**
 * Lectura y validación de CSV (funciones puras, sin base de datos: fáciles de probar).
 *
 * Contrato: los CSV traen montos en PESOS ("420000.50"); la base guarda CENTAVOS (42000050).
 * La conversión se hace con texto, nunca con decimales flotantes, para no perder centavos.
 */

export type TipoColumna = "texto" | "fecha" | "mes" | "entero" | "pesos";

/** Definición de una columna: nombre en el CSV, nombre en la base y tipo. */
export type Columna = { csv: string; db: string; tipo: TipoColumna };

/**
 * Orden seguro por las llaves foráneas: primero catálogos, luego movimientos.
 * Para vaciar se usa el orden inverso.
 */
export const ORDEN_CARGA = ["tiendas", "productos", "ventas_pos", "depositos", "gastos", "ventas_producto"];

/** Tablas que se pueden cargar por CSV y sus columnas (en este orden). */
export const TABLAS: Record<string, Columna[]> = {
	tiendas: [
		{ csv: "tienda_id", db: "tienda_id", tipo: "texto" },
		{ csv: "nombre", db: "nombre", tipo: "texto" },
		{ csv: "region", db: "region", tipo: "texto" },
		{ csv: "ciudad", db: "ciudad", tipo: "texto" },
		{ csv: "formato", db: "formato", tipo: "texto" },
		{ csv: "fecha_apertura", db: "fecha_apertura", tipo: "fecha" },
		{ csv: "m2", db: "m2", tipo: "entero" },
	],
	ventas_pos: [
		{ csv: "fecha", db: "fecha", tipo: "fecha" },
		{ csv: "tienda_id", db: "tienda_id", tipo: "texto" },
		{ csv: "venta", db: "venta_centavos", tipo: "pesos" },
		{ csv: "tickets", db: "tickets", tipo: "entero" },
	],
	depositos: [
		{ csv: "fecha_venta", db: "fecha_venta", tipo: "fecha" },
		{ csv: "tienda_id", db: "tienda_id", tipo: "texto" },
		{ csv: "fecha_deposito", db: "fecha_deposito", tipo: "fecha" },
		{ csv: "monto", db: "monto_centavos", tipo: "pesos" },
		{ csv: "referencia", db: "referencia", tipo: "texto" },
	],
	gastos: [
		{ csv: "mes", db: "mes", tipo: "mes" },
		{ csv: "tienda_id", db: "tienda_id", tipo: "texto" },
		{ csv: "categoria", db: "categoria", tipo: "texto" },
		{ csv: "monto", db: "monto_centavos", tipo: "pesos" },
	],
	productos: [
		{ csv: "producto_id", db: "producto_id", tipo: "texto" },
		{ csv: "nombre", db: "nombre", tipo: "texto" },
		{ csv: "categoria", db: "categoria", tipo: "texto" },
		{ csv: "marca_propia", db: "marca_propia", tipo: "entero" },
		{ csv: "precio_lista", db: "precio_lista_centavos", tipo: "pesos" },
		{ csv: "costo", db: "costo_centavos", tipo: "pesos" },
	],
	ventas_producto: [
		{ csv: "mes", db: "mes", tipo: "mes" },
		{ csv: "tienda_id", db: "tienda_id", tipo: "texto" },
		{ csv: "producto_id", db: "producto_id", tipo: "texto" },
		{ csv: "unidades", db: "unidades", tipo: "entero" },
		{ csv: "venta", db: "venta_centavos", tipo: "pesos" },
		{ csv: "costo", db: "costo_centavos", tipo: "pesos" },
	],
};

/** Separa un CSV en filas y celdas. Soporta comillas ("a, b") y saltos de línea Windows. */
export function parsearCsv(texto: string): string[][] {
	const filas: string[][] = [];
	let fila: string[] = [];
	let celda = "";
	let enComillas = false;
	const t = texto.replace(/^﻿/, ""); // quita BOM de Excel
	for (let i = 0; i < t.length; i++) {
		const ch = t[i];
		if (enComillas) {
			if (ch === '"') {
				if (t[i + 1] === '"') {
					celda += '"';
					i++;
				} else enComillas = false;
			} else celda += ch;
		} else if (ch === '"') enComillas = true;
		else if (ch === ",") {
			fila.push(celda);
			celda = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && t[i + 1] === "\n") i++;
			fila.push(celda);
			celda = "";
			if (fila.some((c) => c.trim() !== "")) filas.push(fila);
			fila = [];
		} else celda += ch;
	}
	fila.push(celda);
	if (fila.some((c) => c.trim() !== "")) filas.push(fila);
	return filas;
}

/** "420000.5" → 42000050. Devuelve null si el texto no es un monto válido. */
export function pesosACentavos(valor: string): number | null {
	const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(valor.trim());
	if (!m) return null;
	const centavos = Number(m[2]) * 100 + Number((m[3] ?? "0").padEnd(2, "0"));
	if (!Number.isSafeInteger(centavos)) return null;
	return m[1] ? -centavos : centavos;
}

function fechaValida(v: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
	const d = new Date(`${v}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export type ResultadoValidacion = {
	filas: (string | number)[][];
	errores: string[];
};

/**
 * Valida un CSV contra la definición de su tabla y lo convierte a valores para la base.
 * Si hay errores, se reportan (máx. 20) y la carga completa se rechaza.
 */
export function validarCsv(tabla: string, texto: string): ResultadoValidacion {
	const columnas = TABLAS[tabla];
	if (!columnas) return { filas: [], errores: [`Tabla desconocida "${tabla}". Opciones: ${Object.keys(TABLAS).join(", ")}`] };
	const [encabezado, ...datos] = parsearCsv(texto);
	if (!encabezado) return { filas: [], errores: ["El CSV está vacío"] };
	const nombres = encabezado.map((h) => h.trim().toLowerCase());
	const esperado = columnas.map((c) => c.csv);
	const indices = esperado.map((n) => nombres.indexOf(n));
	const faltantes = esperado.filter((_, i) => indices[i] === -1);
	if (faltantes.length) {
		return { filas: [], errores: [`Faltan columnas: ${faltantes.join(", ")}. Se esperaban: ${esperado.join(",")}`] };
	}
	const errores: string[] = [];
	const filas: (string | number)[][] = [];
	datos.forEach((celdas, n) => {
		const linea = n + 2; // +1 por el encabezado, +1 porque las líneas empiezan en 1
		const fila: (string | number)[] = [];
		for (let i = 0; i < columnas.length; i++) {
			const col = columnas[i];
			const v = (celdas[indices[i]] ?? "").trim();
			const error = (msg: string) => errores.length < 20 && errores.push(`Línea ${linea}, ${col.csv}: ${msg} ("${v}")`);
			if (v === "") {
				error("valor vacío");
				return;
			}
			if (col.tipo === "texto") fila.push(v);
			else if (col.tipo === "fecha") {
				if (!fechaValida(v)) return void error("fecha inválida, se espera AAAA-MM-DD");
				fila.push(v);
			} else if (col.tipo === "mes") {
				if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return void error("mes inválido, se espera AAAA-MM");
				fila.push(v);
			} else if (col.tipo === "entero") {
				if (!/^-?\d+$/.test(v)) return void error("se espera un número entero");
				fila.push(Number(v));
			} else {
				const c = pesosACentavos(v);
				if (c === null) return void error("monto inválido, se espera 1234.56 (sin $ ni comas)");
				fila.push(c);
			}
		}
		filas.push(fila);
	});
	return { filas, errores };
}

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vite-plus/test";
import { parsearCsv, pesosACentavos, validarCsv } from "../api/csv.ts";

describe("conversión de montos (cuadre al centavo)", () => {
	it("convierte pesos en texto a centavos sin perder precisión", () => {
		expect(pesosACentavos("420000.50")).toBe(42000050);
		expect(pesosACentavos("0.1")).toBe(10);
		expect(pesosACentavos("19.99")).toBe(1999);
		expect(pesosACentavos("-8500")).toBe(-850000);
	});
	it("rechaza montos con formato sucio", () => {
		expect(pesosACentavos("$1,200.00")).toBeNull();
		expect(pesosACentavos("12.345")).toBeNull();
		expect(pesosACentavos("abc")).toBeNull();
	});
});

describe("lectura de CSV", () => {
	it("respeta comillas y saltos de línea de Windows", () => {
		expect(parsearCsv('a,b\r\n"x, y",2\r\n')).toEqual([
			["a", "b"],
			["x, y", "2"],
		]);
	});
	it("valida columnas y tipos", () => {
		const ok = validarCsv("ventas_pos", "fecha,tienda_id,venta,tickets\n2026-10-01,T08,61234.50,410\n");
		expect(ok.errores).toEqual([]);
		expect(ok.filas).toEqual([["2026-10-01", "T08", 6123450, 410]]);
		const mal = validarCsv("ventas_pos", "fecha,tienda_id,venta,tickets\n01/10/2026,T08,61234.50,410\n");
		expect(mal.errores[0]).toContain("fecha inválida");
		const faltan = validarCsv("ventas_pos", "fecha,tienda_id\n2026-10-01,T08\n");
		expect(faltan.errores[0]).toContain("Faltan columnas");
	});
});

describe("API", () => {
	it("GET /api lista las rutas", async () => {
		const res = await SELF.fetch("https://ejemplo.com/api");
		expect(res.status).toBe(200);
		const cuerpo = (await res.json()) as { rutas: Record<string, string> };
		expect(Object.keys(cuerpo.rutas)).toContain("GET /api/kpis");
	});
	it("rechaza cargas sin clave de administrador", async () => {
		const res = await SELF.fetch("https://ejemplo.com/api/admin/cargar?tabla=tiendas", { method: "POST", body: "x" });
		expect(res.status).toBe(401);
	});
	it("responde 404 en JSON para rutas inexistentes", async () => {
		const res = await SELF.fetch("https://ejemplo.com/api/no-existe");
		expect(res.status).toBe(404);
	});
});

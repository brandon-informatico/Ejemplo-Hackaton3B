/**
 * PÁGINA DE PRUEBA DE CONEXIÓN (provisional).
 * Solo demuestra que la página, la API y la base de datos están conectadas.
 * Alex: reemplaza este archivo con el tablero real. El cliente de la API está en ./api.ts
 */
import { useEffect, useState } from "react";
import { api, pesos, type Kpis, type ProductoTop, type Salud } from "./api";

export function App() {
	const [salud, setSalud] = useState<Salud | null>(null);
	const [kpis, setKpis] = useState<Kpis | null>(null);
	const [top, setTop] = useState<ProductoTop[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([api.salud(), api.kpis(), api.productosTop({ limite: 5 })])
			.then(([s, k, t]) => {
				setSalud(s);
				setKpis(k);
				setTop(t.datos);
			})
			.catch((e: Error) => setError(e.message));
	}, []);

	return (
		<main>
			<h1>Pulso Financiero 3B</h1>
			<p className="sub">Infraestructura lista · página provisional para comprobar la conexión</p>

			{error && <p className="error">No se pudo conectar con la API: {error}</p>}
			{!error && !salud && <p>Conectando con la API…</p>}

			{salud && (
				<section>
					<h2>Estado</h2>
					<p>
						API: <b className={salud.ok ? "ok" : "error"}>{salud.ok ? "en línea" : "con problemas"}</b> · Base de datos:{" "}
						<b>{salud.base_de_datos}</b>
						{salud.periodo_datos?.desde && (
							<>
								{" "}
								· Datos del {salud.periodo_datos.desde} al {salud.periodo_datos.hasta}
							</>
						)}
					</p>
					{salud.filas && (
						<p className="pequeno">
							{Object.entries(salud.filas)
								.map(([t, n]) => `${t}: ${n.toLocaleString("es-MX")}`)
								.join(" · ")}
						</p>
					)}
				</section>
			)}

			{kpis && (
				<section className="tarjetas">
					<article>
						<span>Ventas</span>
						<b>{pesos(kpis.ventas)}</b>
					</article>
					<article>
						<span>Gastos operativos</span>
						<b>{pesos(kpis.gastos_operativos)}</b>
					</article>
					<article>
						<span>Utilidad operativa</span>
						<b>{pesos(kpis.utilidad_operativa)}</b>
						<small>{kpis.margen_operativo_pct}% de la venta</small>
					</article>
					<article>
						<span>Diferencia de efectivo</span>
						<b>{pesos(kpis.diferencia_efectivo)}</b>
						<small>{kpis.dias_sin_deposito} días sin depósito</small>
					</article>
				</section>
			)}

			{top.length > 0 && (
				<section>
					<h2>Productos con más venta</h2>
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Producto</th>
								<th>Unidades</th>
								<th>Venta</th>
							</tr>
						</thead>
						<tbody>
							{top.map((p) => (
								<tr key={p.producto_id}>
									<td>{p.lugar}</td>
									<td>{p.nombre}</td>
									<td>{p.unidades.toLocaleString("es-MX")}</td>
									<td>{pesos(p.venta)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			)}

			<p className="pequeno">
				Rutas disponibles: <a href="/api">/api</a> · Guía para el frontend: docs/frontend/README.md
			</p>
		</main>
	);
}

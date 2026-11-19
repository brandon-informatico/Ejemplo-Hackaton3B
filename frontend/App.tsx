/**
 * PÁGINA INICIAL (provisional).
 * Solo confirma que el servidor está publicando la página.
 * Alex: reemplaza este archivo con el tablero. Guía en docs/frontend/README.md
 */
export function App() {
	return (
		<main>
			<h1>Pulso Financiero 3B</h1>
			<p className="sub">El servidor está listo. Aquí va el tablero de finanzas.</p>
			<section className="tarjetas">
				<article>
					<span>Ventas</span>
					<b>—</b>
				</article>
				<article>
					<span>Gastos</span>
					<b>—</b>
				</article>
				<article>
					<span>Margen neto</span>
					<b>—</b>
				</article>
				<article>
					<span>Diferencia de efectivo</span>
					<b>—</b>
				</article>
			</section>
			<p className="pequeno">Reto 7 · Control financiero y flujo de efectivo por tienda · 2° Hackatón Tiendas 3B</p>
		</main>
	);
}

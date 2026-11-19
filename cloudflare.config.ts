/**
 * SERVIDOR DE LA PÁGINA WEB (Cloudflare)
 * --------------------------------------
 * Sitio estático: Cloudflare publica lo que construye Vite a partir de /frontend.
 * URL pública: https://pulso-financiero-3b.<subdominio>.workers.dev
 *
 * El backend (API y base de datos) lo agregará el equipo de backend más adelante.
 * Responsables de este archivo: Omar (nube) y Armando (despliegue).
 * Si cambias algo aquí, avisa en el chat del equipo: afecta a todos.
 */
import { defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "pulso-financiero-3b",
		compatibilityDate: "2026-11-17",
		assets: {
			// Si alguien recarga /tiendas/T08 en el navegador, React decide qué mostrar.
			notFoundHandling: "single-page-application",
		},
		// URL pública gratuita en workers.dev
		workersDev: true,
		// Cada versión publicada tiene su propia URL de prueba (útil para revisar antes de publicar).
		previewUrls: true,
	},
});

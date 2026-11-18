/**
 * INFRAESTRUCTURA DE PULSO FINANCIERO 3B (Cloudflare)
 * ---------------------------------------------------
 * Un solo Worker sirve las dos partes de la aplicación en la misma URL:
 *   - /api/*        → backend (código en /api, framework Hono) conectado a la base D1
 *   - todo lo demás → página web (código en /frontend, React + Vite)
 *
 * Responsables: Omar (arquitectura / nube) y Armando (despliegue).
 * Si cambias algo aquí, avisa en el chat del equipo: afecta a todos.
 */
import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./api/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "pulso-financiero-3b",
		compatibilityDate: "2026-11-17",
		entrypoint,
		assets: {
			// Las rutas /api/* siempre las atiende el backend; el resto, la página web.
			runWorkerFirst: ["/api/*"],
			// Si alguien recarga /tiendas/T08 en el navegador, React decide qué mostrar.
			notFoundHandling: "single-page-application",
		},
		// URL pública gratuita: https://pulso-financiero-3b.<subdominio>.workers.dev
		workersDev: true,
		// Cada versión subida tiene su propia URL de prueba (útil para revisar antes de publicar).
		previewUrls: true,
		// Logs visibles en el panel de Cloudflare (Workers > pulso-financiero-3b > Logs).
		observability: { enabled: true },
		env: {
			// Base de datos SQLite en la nube (D1). En el código: env.DB
			DB: bindings.d1({
				name: "pulso-financiero-db",
				id: "57eced06-ff9e-4e8f-9269-01a192a72432",
			}),
			// Clave para cargar CSV por /api/admin/cargar. Nunca se sube a GitHub:
			// en local vive en .dev.vars y en la nube se guarda como "secret".
			ADMIN_TOKEN: bindings.secret(),
			ENTORNO: bindings.text("demo-practica"),
		},
	},
});

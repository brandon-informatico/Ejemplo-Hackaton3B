/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** URL de la API. Vacío = misma URL que la página (lo normal). */
	readonly VITE_API_URL?: string;
}

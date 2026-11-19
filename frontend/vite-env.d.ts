/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** URL de la API cuando el equipo de backend la publique (se define en .env.local). */
	readonly VITE_API_URL?: string;
}

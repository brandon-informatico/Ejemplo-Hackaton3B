import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
	// react(): la página web (carpeta /frontend). cloudflare(): el backend (carpeta /api) y la base D1.
	plugins: [react(), cloudflare()],
	fmt: { useTabs: true },
	lint: {
		options: { typeAware: true, typeCheck: true },
	},
});

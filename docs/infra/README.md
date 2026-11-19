# Servidor en Cloudflare · Pulso Financiero 3B

Responsables: **Omar** (nube) y **Armando** (despliegue).

## Qué hay hoy

```
https://pulso-financiero-3b.1011estudio-ia.workers.dev
                 │
        Cloudflare Worker "pulso-financiero-3b"
                 │
        Página web (React + Vite, carpeta /frontend)
```

- Sitio **estático**: Cloudflare publica lo que Vite construye a partir de `/frontend`.
- **Base de datos**: Cloudflare D1 `pulso-financiero-db` con el dataset cargado. Todavía no está conectada a la página; backend la usa desde sus computadoras ([manual](../backend/README.md)).
- **Backend (API)**: lo agregará el equipo de backend.
- Configuración: [`cloudflare.config.ts`](../../cloudflare.config.ts) (formato del CLI `cf` 1.0).
- Si alguien recarga una ruta como `/tiendas/T08`, el servidor entrega la página y React decide qué mostrar.

## Costos

La cuenta está en el **plan gratuito**. Un sitio estático en Cloudflare no tiene costo y las visitas a archivos estáticos no consumen el límite de peticiones del plan gratis.

## Comandos

| Qué | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Servidor local de la página | `npm run dev` → http://localhost:5173 |
| Construir sin publicar | `npm run build` |
| Publicar en la nube | `npm run deploy` |
| Revisar tipos | `npm run typecheck` |
| Regenerar el dataset | `npm run datos:generar` |

Para publicar se necesita haber iniciado sesión en Cloudflare: `npx cf auth login`.

## Dar acceso a Armando a Cloudflare

Panel de Cloudflare → *Manage Account* → *Members* → invitar con rol **Workers Admin**. (Cambia permisos de la cuenta: lo hace Omar.)

## Problemas conocidos

| Síntoma | Causa / solución |
|---|---|
| `[10007] This Worker does not exist` la primera vez que se publica un Worker nuevo | Volver a correr `npm run deploy`. |

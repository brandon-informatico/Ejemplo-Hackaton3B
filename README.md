# Ejemplo-Hackaton3B · Pulso Financiero 3B

Problema financiero, con la finalidad de practicar la colaboración entre 5 miembros del equipo para sacar una solución.

**Reto 7 · Control financiero y flujo de efectivo por tienda** (2° Hackatón Tiendas 3B). Contexto completo: [CONTEXT.md](CONTEXT.md).

## En línea

- App: https://pulso-financiero-3b.1011estudio-ia.workers.dev
- API: https://pulso-financiero-3b.1011estudio-ia.workers.dev/api

## Guías

| Para | Documento |
|---|---|
| Frontend (Alex, Armando): cómo conectarse a la API | [docs/frontend/README.md](docs/frontend/README.md) |
| Nube (Omar, Armando): arquitectura, comandos, costos y límites | [docs/infra/README.md](docs/infra/README.md) |
| Datos: diccionario, anomalías sembradas | [data/README.md](data/README.md) |
| Datos: qué es real y qué es simulado | [data/FUENTES.md](data/FUENTES.md) |

## Inicio rápido

```powershell
npm install
npm run db:migrar:local
npm run dev
```

En otra terminal (con `npm run dev` corriendo y un archivo `.dev.vars` con `ADMIN_TOKEN=...`):

```powershell
npm run datos:cargar:local
```

Abre http://localhost:5173.

## Estructura

```
api/              backend (Cloudflare Worker + Hono, TypeScript)
frontend/         página web (React + Vite)
data/             generador y carga de datos (Python), CSV de práctica
migrations/       esquema de la base D1
docs/             guías para el equipo
cloudflare.config.ts  infraestructura (Worker + base D1)
```

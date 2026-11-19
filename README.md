# Ejemplo-Hackaton3B · Pulso Financiero 3B

Problema financiero, con la finalidad de practicar la colaboración entre 5 miembros del equipo para sacar una solución.

**Reto 7 · Control financiero y flujo de efectivo por tienda** (2° Hackatón Tiendas 3B). Contexto completo: [CONTEXT.md](CONTEXT.md).

## Estado

| Parte | Estado | Dónde |
|---|---|---|
| Dataset limpio y normalizado | ✅ Listo para backend | [dataset/](dataset) |
| Base de datos con el dataset cargado | ✅ Lista (Cloudflare D1 `pulso-financiero-db`) | [docs/backend/README.md](docs/backend/README.md) |
| Servidor de la página web | ✅ En línea | https://pulso-financiero-3b.1011estudio-ia.workers.dev |
| Página web (tablero) | 🔨 Por construir (front) | [frontend/](frontend) |
| Backend (API, cálculos) | 🔨 Por construir (backend) | — |

## Guías

| Para | Documento |
|---|---|
| Backend: **manual de la base de datos** (conexión desde sus computadoras) | [docs/backend/README.md](docs/backend/README.md) |
| Backend: qué datos hay y qué significa cada columna | [dataset/README.md](dataset/README.md) |
| Todos: qué datos son reales y cuáles simulados | [dataset/FUENTES.md](dataset/FUENTES.md) |
| Frontend: cómo correr y publicar la página | [docs/frontend/README.md](docs/frontend/README.md) |
| Nube: servidor, comandos y costos | [docs/infra/README.md](docs/infra/README.md) |

## Inicio rápido (página web)

```powershell
npm install
npm run dev
```

Abre http://localhost:5173.

## Estructura

```
dataset/              datos limpios (CSV), diccionario, fuentes y generador
frontend/             página web (React + Vite)
docs/                 guías: backend (base de datos), frontend e infra
cloudflare.config.ts  servidor de la página en Cloudflare
```

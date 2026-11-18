# Infraestructura en Cloudflare · Pulso Financiero 3B

Responsables: **Omar** (arquitectura, nube, IA) y **Armando** (despliegue, monitoreo).

## Arquitectura

```
                 https://pulso-financiero-3b.1011estudio-ia.workers.dev
                                         │
                          ┌──────────────┴──────────────┐
                          │   Cloudflare Worker          │
                          │   "pulso-financiero-3b"      │
         /api/*  ────────►│   backend: /api (Hono, TS)   │──────► D1 "pulso-financiero-db"
                          │                              │        (SQLite en la nube, región WNAM)
   todo lo demás ────────►│   página: /frontend (React)  │
                          └──────────────────────────────┘
                                         ▲
               data/cargar_datos.py ─────┘  POST /api/admin/cargar (con clave)
```

- **Un solo Worker** sirve la página y la API en la misma URL (sin problemas de CORS).
- **D1** es SQLite administrado por Cloudflare. El esquema está en [`migrations/`](../../migrations).
- La configuración completa está en [`cloudflare.config.ts`](../../cloudflare.config.ts) (formato del CLI `cf` 1.0).

| Recurso | Nombre | Identificador |
|---|---|---|
| Worker | `pulso-financiero-3b` | URL arriba |
| Base D1 | `pulso-financiero-db` | `57eced06-ff9e-4e8f-9269-01a192a72432` |
| Clave de carga | `ADMIN_TOKEN` (secret) | solo en `.dev.vars` (local) y `.dev.vars.nube` (nube), nunca en GitHub |

## ¿Por qué Cloudflare y no Python + FastAPI + Supabase (lo que decía el plan)?

- **Gratis y sin servidor que mantener**: no hay que encender, parchar ni pagar una máquina.
- **Rápido en todo el mundo** y con una URL pública estable para el jurado.
- La API está en **TypeScript** porque es el lenguaje más estable en Cloudflare Workers. Python sigue en `/data` (generar, limpiar y cargar datos). Cloudflare también acepta Workers en Python (FastAPI), pero aún tiene más pasos para instalar paquetes; se puede evaluar si el equipo lo prefiere.

## Costos y límites (plan gratuito)

La cuenta está en el **plan gratis**: si se rebasa un límite, Cloudflare rechaza peticiones hasta las 18:00 h de México (00:00 UTC); **no cobra**.

| Límite diario | Plan gratis | Uso estimado |
|---|---|---|
| Peticiones al Worker | 100,000 / día | una recarga del tablero ≈ 5 peticiones |
| Filas leídas en D1 | 5,000,000 / día | una recarga completa del tablero ≈ 40 mil filas (hay caché de 30 s) |
| Filas escritas en D1 | 100,000 / día | **una carga completa ≈ 17,500**; vaciar + recargar ≈ 35,000 |
| Tamaño de base | 500 MB | hoy < 5 MB |
| Tiempo de CPU | 10 ms por petición | el tiempo esperando a D1 no cuenta como CPU; por eso la carga de CSV va en partes de 2,000 filas |

Recomendaciones:

1. **Desarrollar contra la base local** (`npm run dev`): no tiene límites.
2. Recargar la base de la nube **máximo 2 veces al día**.
3. Si el sábado los datos oficiales son grandes (más de ~100 mil filas), el **plan Workers Paid (USD 5 al mes)** quita estos límites. *Esto cuesta dinero: decidirlo antes del evento.*

## Comandos

| Qué | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Servidor local (página + API + D1 local) | `npm run dev` |
| Crear/actualizar tablas en local | `npm run db:migrar:local` |
| Crear/actualizar tablas en la nube | `npm run db:migrar:nube` |
| Regenerar los CSV de práctica | `npm run datos:generar` |
| Cargar CSV a la base local | `npm run datos:cargar:local` (con `npm run dev` corriendo) |
| Cargar CSV a la nube | `npm run datos:cargar:nube` |
| Publicar en la nube | `npm run deploy:nube` |
| Pruebas automáticas | `npm test` |
| Revisar tipos | `npm run typecheck` |
| Ver logs en vivo | panel de Cloudflare → Workers & Pages → pulso-financiero-3b → Logs |

Se necesita el CLI de Cloudflare (`npm install -g cf` o usar `npx cf`) y haber iniciado sesión con `cf auth login`.

## Claves (secrets)

- `.dev.vars` → clave local; cada quien crea la suya: `ADMIN_TOKEN=lo-que-quieras`.
- `.dev.vars.nube` → clave real de la nube. **Solo la tienen Omar y Armando.** Se comparte por mensaje privado, nunca en el repo ni en el chat del equipo.
- `npm run deploy:nube` sube la clave a Cloudflare como *secret* en cada despliegue.
- Ambos archivos están en `.gitignore`.

## Dar acceso a Armando a Cloudflare

Panel de Cloudflare → *Manage Account* → *Members* → invitar con rol **Workers Admin**. (Cambia permisos de la cuenta: lo hace Omar.)

## Agregar una tabla o columna

1. `npx cf d1 migrations create` → crea `migrations/0002_....sql`; escribe ahí el `ALTER TABLE` / `CREATE TABLE`.
2. `npm run db:migrar:local`, prueba, y luego `npm run db:migrar:nube`.
3. Si se carga por CSV, agrega la definición en [`api/csv.ts`](../../api/csv.ts) (`TABLAS`).
4. Avisa en el chat del equipo y actualiza [`CONTEXT.md`](../../CONTEXT.md).

## Problemas conocidos

| Síntoma | Causa / solución |
|---|---|
| `[10007] This Worker does not exist` en el primer `cf deploy` | Pasa solo la primera vez que se crea el Worker; volver a correr `npm run deploy:nube`. |
| `D1_ERROR: ... daily limit` | Se llegó al límite gratis del día; esperar a las 18:00 h o usar la base local. |
| `FOREIGN KEY constraint failed` al cargar | Se intentó cargar movimientos antes que los catálogos; usar `data/cargar_datos.py`, que respeta el orden. |

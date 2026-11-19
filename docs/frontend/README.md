# Guía para el frontend · Pulso Financiero 3B

Para: **Alex** (líder front-end) y **Armando** (gráficas).
El servidor ya está listo para que la página viva ahí. Esta guía explica cómo trabajar y cómo publicar.

## 1. Lo esencial

| Qué | Dónde |
|---|---|
| Página publicada | https://pulso-financiero-3b.1011estudio-ia.workers.dev |
| Tu código | carpeta [`/frontend`](../../frontend) + [`index.html`](../../index.html) |
| Página inicial (para reemplazar) | [`frontend/App.tsx`](../../frontend/App.tsx) |
| Estilos | [`frontend/estilos.css`](../../frontend/estilos.css) (tema claro/oscuro) |
| Stack | React 19 + Vite + TypeScript |
| Gráficas de Armando | crear `frontend/components/charts/` |

## 2. Correr la página en tu computadora (primera vez)

Necesitas Node.js 22 o 24 y Git.

```powershell
git clone https://github.com/brandon-informatico/Ejemplo-Hackaton3B.git
```

```powershell
cd Ejemplo-Hackaton3B
```

```powershell
npm install
```

```powershell
npm run dev
```

Abre http://localhost:5173. Cada vez que guardas un archivo de `/frontend`, la página se actualiza sola.

Para agregar librerías (por ejemplo Recharts para gráficas):

```powershell
npm install recharts
```

## 3. ¿De dónde salen los datos?

- **Todavía no hay API**: la hará el equipo de backend. Cuando exista, te pasarán su URL y la guardas en un archivo `.env.local`:
  ```
  VITE_API_URL=https://url-que-te-pase-backend
  ```
  y en el código la lees con `import.meta.env.VITE_API_URL`.
- **Mientras tanto**, puedes diseñar con los datos de práctica de [`/dataset/csv`](../../dataset/csv) (los mismos que usará backend). El significado de cada columna está en [`dataset/README.md`](../../dataset/README.md).
- Acuerden con backend la forma del JSON de cada pantalla y anótenla en [`CONTEXT.md`](../../CONTEXT.md) antes de programar.

Pantallas que pide el reto (ver `CONTEXT.md`):
1. Cuatro tarjetas arriba: ventas, gastos, margen neto y diferencia de efectivo.
2. Filtros de región, tienda y periodo.
3. Panel de alertas por severidad (crítica, alta, media) con explicación y acción sugerida.
4. Curva de flujo de una tienda nueva con su mes de punto de equilibrio.
5. Espacio para el resumen de IA y el buscador "Pregúntale al tablero".

Convenciones de los datos: montos en pesos MXN con 2 decimales, fechas `AAAA-MM-DD`, meses `AAAA-MM`. Para mostrar pesos:

```ts
const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
```

## 4. Publicar tus cambios en la nube

1. Trabaja en tu rama: `git checkout -b alex/tablero`.
2. Sube tu rama a GitHub y pide revisión a Omar.
3. Omar o Armando publican con `npm run deploy` (requiere acceso a la cuenta de Cloudflare). La página se actualiza en la misma URL en segundos.

## 5. Si algo falla

| Síntoma | Solución |
|---|---|
| `npm run dev` dice que el puerto está ocupado | Cierra la otra terminal que lo usa, o corre `npm run dev -- --port 5174` |
| `npm install` falla | Revisa tu versión de Node con `node -v` (debe ser 22 o 24) |
| La página en la nube no muestra tu cambio | ¿Ya se publicó con `npm run deploy`? Recarga con Ctrl+F5 |

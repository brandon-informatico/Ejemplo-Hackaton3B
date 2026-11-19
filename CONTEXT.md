RETO 7  ·  CONTROL FINANCIERO Y FLUJO DE EFECTIVO POR TIENDA
Visibilidad del gasto y del efectivo en una red que crece rápido

PROBLEMÁTICA
Con aperturas constantes, el área financiera necesita saber rápido cuánto cuesta operar cada tienda, cuándo una tienda nueva se vuelve rentable y dónde hay gastos o diferencias de efectivo 
fuera de lo normal. Cuando esta información llega tarde o en archivos separados, las desviaciones se detectan después de que afectaron el margen.
OBJETIVO DEL RETO
Desarrollar una herramienta que consolide ingresos y gastos por tienda (o región), proyecte el flujo de efectivo de tiendas nuevas y alerte sobre gastos atípicos o diferencias entre venta y depósito.
ENTREGABLES ESPERADOS
Vista consolidada de ingresos, gastos y margen por tienda o región, con filtros por periodo.
Regla o modelo de detección de gastos fuera de patrón (por ejemplo, desviación frente al histórico o a tiendas similares).
Proyección simple del flujo de efectivo de una tienda nueva durante sus primeros meses.
Lista priorizada de alertas con una acción sugerida para cada una.
STACK / LINEAMIENTOS TÉCNICOS SUGERIDOS
Python o Excel avanzado para limpiar y consolidar datos, y un tablero ligero para la visualización. Las reglas de alerta pueden ser simples y explicables; se valora más que el equipo financiero
pueda confiar en ellas que un modelo complejo.
CRITERIOS DE EVALUACIÓN
Criterio,                  Peso,      Qué se evalúa
Utilidad para finanzas      30%       Responde preguntas reales de control de gasto y efectivo, no solo muestra datos.
Calidad de las alertas      25%       Detecta desviaciones relevantes con pocas falsas alarmas y explica por qué alertó.
Rigor de los números        25%       Las cifras cuadran entre vistas y los supuestos de la proyección son razonables.
Claridad de presentación    20%       Un directivo entiende el resultado y la acción recomendada en pocos minutos.

REGLAS PARA LAS IA:

> Este apartado es obligatorio para **cualquier IA** que use el equipo (Claude, ChatGPT, Copilot, Gemini, Cursor, etc.).
> Objetivo: que el código de los 5 integrantes use los mismos nombres, formatos y convenciones, y que al unirlo funcione a la primera.
> Si una IA propone algo que contradice este documento, **gana este documento**. Solo Omar cambia estas reglas y avisa en el chat del equipo.

### 0. Cómo usar estas reglas (para las personas)

1. Al iniciar cada sesión con tu IA, dale **este archivo completo** (adjúntalo o pégalo) y el prompt de arranque de la sección 13.
2. Dile a tu IA cuál es tu rol y tu territorio (sección 2).
3. Si tu IA genera algo raro (nombres en inglés, otro formato de fecha, una librería nueva), pídele que lo corrija citando la regla: "cumple la regla 4.3 de CONTEXT.md".

### 1. Principios (en orden de prioridad)

1. **Un solo origen de los números.** Ninguna cifra aparece en pantalla si no sale del motor de cálculo. La IA nunca inventa cifras, datos de ejemplo, columnas ni resultados.
2. **Todo cuadra al centavo.** El dinero se calcula en centavos enteros o con `Decimal`, nunca con decimales flotantes (`float`). Las cifras deben coincidir entre tarjetas, tablas y gráficas.
3. **Explicable antes que complejo.** Reglas simples con umbrales escritos aquí. Nada de modelos "caja negra": cada alerta dice qué regla la activó y con qué cifras.
4. **Contrato primero.** Nombres de columnas, campos JSON y rutas de la API se definen aquí. Nadie los cambia sin avisar en el chat y actualizar este archivo **antes** de subir el código.
5. **Cada quien en su territorio.** La IA solo modifica archivos del territorio de su persona (sección 2). Si necesita tocar otro, se detiene y lo pide.
6. **Simple y legible.** Código que un compañero entienda en un minuto. Cambios pequeños, sin reescribir archivos completos, sin librerías nuevas que no hagan falta.

### 2. Equipo, territorios y estructura del repositorio

| Integrante | Rol | Territorio (carpetas y archivos que puede modificar) |
|---|---|---|
| Omar | Líder técnico, datos, nube e IA | `/dataset`, `/ai`, `CONTEXT.md`, `/docs`, configuración de la nube |
| Patrick | Backend: conciliación y rigor contable | `/motor/conciliacion.py` (conciliación y KPIs por tienda y región) |
| Alejandro García | Backend y QA | `/motor/alertas.py`, `/motor/proyeccion.py`, `/motor/parametros.py`, `/api`, `/tests` |
| Alex Copca | Frontend (interfaz ejecutiva) | `/frontend` (excepto `components/charts`), `index.html` |
| Armando | Nube, gráficas y acciones | `/motor/acciones.py`, `/frontend/components/charts`, configuración de la nube |

Estructura acordada (las carpetas se crean cuando se necesiten, con estos nombres exactos):

```
/dataset        datos limpios (CSV), diccionario de datos, fuentes, scripts de limpieza
/motor          cálculos puros: conciliacion.py, alertas.py, proyeccion.py, acciones.py, parametros.py
/api            API (FastAPI): solo recibe peticiones, llama al motor y responde
/ai             capa de IA: resumen ejecutivo y "Pregúntale al tablero"
/tests          pruebas automáticas (pytest)
/frontend       página web (React + Vite + TypeScript)
/docs           guías para el equipo
```

### 3. Stack oficial

| Parte | Tecnología |
|---|---|
| Datos y cálculos | Python 3.11 o más nuevo, pandas |
| API | FastAPI (documentación automática en `/docs`) |
| Frontend | React + Vite + TypeScript, gráficas con Recharts |
| Base de datos | Cloudflare D1 `pulso-financiero-db` o los CSV de `/dataset` (tienen los mismos datos) |
| Hosting de la página | Cloudflare (sitio estático) |
| Repositorio | GitHub, una rama por integrante |

La IA **no** cambia de tecnología ni agrega frameworks (Django, Flask, Next.js, Angular, Tailwind, etc.) sin acuerdo del equipo.

### 4. Idioma y nombres

1. **Español** en comentarios, documentación, mensajes de commit, textos de pantalla y mensajes de error.
2. **Identificadores del negocio en español, sin acentos ni ñ**: `tienda`, `deposito`, `region`, `anio`, `promedio_movil`. Las palabras técnicas comunes pueden quedar en inglés (`id`, `df`, `api`, `request`, `props`).
3. Formato de nombres según el lenguaje:

| Dónde | Variables y funciones | Clases, tipos y componentes | Constantes | Archivos |
|---|---|---|---|---|
| Python | `snake_case` | `PascalCase` | `MAYUSCULAS` | `snake_case.py` |
| TypeScript / React | `camelCase` | `PascalCase` | `MAYUSCULAS` | componentes `PascalCase.tsx`; el resto `camelCase.ts` |
| CSV, columnas de base de datos y campos JSON | `snake_case` en español | — | — | `snake_case.csv` |
| Rutas de la API | `kebab-case` en español: `/api/cargar-csv` | — | — | — |

4. **Glosario obligatorio.** Usar siempre estas palabras (no sinónimos):

| Usar | No usar |
|---|---|
| `tienda`, `tienda_id` (valor `"T08"`) | sucursal, store, branch |
| `region` (Centro, Norte, Sur, Occidente, Bajío) | zona |
| `formato` (Compacta, Estándar, Plus) | tipo de tienda |
| `venta_pos` / `venta` (lo cobrado en caja) | ingreso, sales, revenue |
| `deposito`, `depositado` (lo confirmado por el banco) | abono, ingreso bancario |
| `diferencia` = venta_pos − depositado | faltante (solo en textos de pantalla) |
| `gasto`, `categoria` (renta, luz, nomina, mantenimiento, merma) | costo fijo, egreso |
| `costo_ventas` (costo de la mercancía vendida) | costo |
| `utilidad_bruta`, `margen_bruto_pct` | ganancia |
| `utilidad_operativa`, `margen_operativo_pct` (la tarjeta "Margen neto") | profit |
| `alerta`, `severidad` (`critica`, `alta`, `media`), `accion_sugerida` | warning, prioridad |
| `proyeccion`, `punto_equilibrio` | forecast, break even |
| `producto_id` (valor `"P001"`) | sku |

Los **valores** de los datos se escriben tal como vienen en el dataset, con acentos: `"Bajío"`, `"Estándar"`. La regla de "sin acentos" es solo para nombres de variables y funciones.

### 5. Datos, fechas y dinero

1. **Fuente única:** `/dataset/csv` o la base D1 (mismos datos). El significado de cada columna está en `dataset/README.md`. La IA no crea datos de prueba propios: usa estos.
2. **Nadie edita los CSV a mano.** Cualquier limpieza se hace con un script en `/dataset` (territorio de Omar). El sábado, los datos oficiales se limpian para que queden **con las mismas columnas**; así el resto del código no cambia.
3. **Fechas** en formato ISO: día `"AAAA-MM-DD"`, mes `"AAAA-MM"`. Zona horaria: `America/Mexico_City`. La semana va de lunes a domingo y se identifica por la fecha de su lunes. Los rangos `desde`/`hasta` incluyen ambos extremos.
4. **Dinero:** pesos mexicanos (MXN).
   - Para calcular: centavos enteros (`int`) o `Decimal`. Nunca sumar `float`.
   - Se redondea **solo al final** y a 2 decimales (redondeo "hacia arriba desde .5", `ROUND_HALF_UP`).
   - En la base D1 las columnas de dinero terminan en `_centavos`; en CSV y JSON van en pesos con 2 decimales.
   - Con pandas, convertir al leer:
     ```python
     ventas["venta_centavos"] = (ventas["venta"] * 100).round().astype("int64")
     ```
5. **Porcentajes:** en unidades de porcentaje con 2 decimales (`2.04` significa 2.04%) y el nombre termina en `_pct`. Se calculan a partir de centavos.
6. **Valores faltantes:** en JSON se mandan como `null`, nunca `NaN` ni `""`. Si un cálculo no se puede hacer (por ejemplo, dividir entre cero), el resultado es `null`, no `0`.
7. **Validación de entradas:** todo archivo o dato que entre al sistema se valida (columnas, vacíos, duplicados, fechas, montos negativos). Si algo está mal, se rechaza con un mensaje en español que diga la fila y la columna. Nunca se "arregla" en silencio.

### 6. Reglas del negocio (umbrales oficiales)

Los números de esta sección viven **en un solo lugar del código**: `/motor/parametros.py`. Nadie repite estos valores sueltos en otros archivos.

| Parámetro | Valor | Uso |
|---|---|---|
| `UMBRAL_DIFERENCIA_PCT` | 0.5 | Alerta si la diferencia acumulada de la semana supera 0.5% de la venta |
| `UMBRAL_DIFERENCIA_CRITICA` | 5000 (pesos) | La alerta es crítica si además supera $5,000 |
| `UMBRAL_GASTO_ATIPICO_PCT` | 25 | Gasto atípico si supera en más de 25% **ambas** referencias |
| `MESES_PROMEDIO_MOVIL` | 3 | Ventana del promedio móvil de gasto |

1. **Conciliación (Patrick):** `diferencia = venta_pos − depositado`, por día y acumulada por semana. Si el banco no confirmó un día, ese depósito cuenta como 0.
2. **Gasto atípico (Alejandro):** cada categoría se compara contra (a) el promedio móvil de 3 meses de la misma tienda y (b) la mediana de las tiendas del mismo `formato` y `region` en el mismo mes. Alerta solo si supera **las dos** en más de 25% (esto evita falsas alarmas por temporada).
3. **Proyección de tienda nueva (Alejandro):** `venta(m) = venta_inicial × (1 + crecimiento)^(m − 1)`; `resultado(m) = venta(m) × margen_bruto − gastos_fijos`. El punto de equilibrio es el primer mes con resultado positivo. Los supuestos son editables y se muestran junto a la curva.
4. **Indicadores (Patrick valida):** `utilidad_bruta = venta − costo_ventas`; `gastos_operativos = renta + luz + nomina + mantenimiento + merma`; `utilidad_operativa = utilidad_bruta − gastos_operativos`.
5. **Severidad:** `critica` (rojo), `alta` (ámbar), `media` (amarillo). Las alertas se ordenan de mayor a menor severidad y, dentro de cada una, por monto de desviación.
6. **Cada alerta lleva su acción sugerida** (Armando), con el monto dentro del texto. Ejemplo: "Faltante de $12,042.39 en Tienda 08: auditar cortes de caja, fichas de depósito y arqueos de los últimos 5 días."
7. Para medir aciertos y falsas alarmas se usa `dataset/csv/anomalias_esperadas.csv`.

### 7. Contrato de la API (convenciones)

1. Todas las rutas empiezan con `/api` y van en español: `/api/kpis`, `/api/alertas`, `/api/proyecciones/{tienda_id}`, `/api/cargar-csv`, `/api/ai/resumen-ejecutivo`, `/api/ai/preguntar`.
2. **Filtros** (en la URL, todos opcionales y con estos nombres): `region`, `tienda` (valor `tienda_id`), `desde`, `hasta` (`AAAA-MM` o `AAAA-MM-DD`), `periodo` (`AAAA-MM`, atajo para un mes).
3. **Respuestas de lista:**
   ```json
   { "filtros": { "region": "Sur" }, "total": 2, "datos": [ { }, { } ] }
   ```
4. **Errores:** `{ "error": "mensaje en español para la persona" }` con código HTTP 400 (dato mal enviado), 404 (no existe), 422 (CSV inválido) o 500 (error interno). En FastAPI se configura un manejador de errores para usar este formato en lugar del `{"detail": ...}` predeterminado.
5. **Forma de una alerta** (la usan Alejandro, Armando y Alex: no se cambia sin avisar):
   ```json
   {
     "id": "A-0001",
     "tienda_id": "T08",
     "tienda": "Tienda 08",
     "region": "Sur",
     "regla": "venta_vs_deposito",
     "severidad": "critica",
     "periodo": { "desde": "2026-10-19", "hasta": "2026-10-25" },
     "cifras": { "valor": 602119.46, "referencia": 590077.07, "etiqueta_valor": "Venta POS", "etiqueta_referencia": "Depositado" },
     "desviacion": { "monto": 12042.39, "pct": 2.0 },
     "explicacion": "La venta POS de la semana fue $602,119.46 y el banco confirmó $590,077.07: faltan $12,042.39 (2.0%).",
     "accion_sugerida": "Auditar cortes de caja, fichas de depósito y arqueos de los últimos 5 días."
   }
   ```
   Valores de `regla`: `venta_vs_deposito`, `gasto_atipico`, `venta_vs_proyeccion`.
6. **Campos de `/api/kpis`** (las 4 tarjetas): `ventas`, `gastos_operativos`, `utilidad_operativa`, `margen_operativo_pct`, `depositado`, `diferencia_efectivo`, `diferencia_efectivo_pct`.
7. Antes de que el frontend use una ruta nueva, se anota aquí (ruta, filtros y ejemplo de respuesta).

### 8. Código Python (dataset, motor, API, IA)

1. Python 3.11 o más nuevo. Entorno virtual en `.venv` (no se sube a GitHub). Las librerías se anotan en `requirements.txt` con versión exacta (`pandas==2.2.3`).
2. **Formato y revisión:** `ruff format` y `ruff check` antes de cada commit.
3. **Tipos y documentación:** toda función pública lleva tipos (`def conciliar(ventas: pd.DataFrame, depositos: pd.DataFrame) -> pd.DataFrame:`) y una docstring corta en español que diga qué recibe y qué devuelve.
4. **El motor es "puro":** las funciones de `/motor` reciben DataFrames o valores y devuelven DataFrames o diccionarios. No leen archivos, no consultan la base y no hacen peticiones a internet. La API (`/api`) es la única que lee los datos, llama al motor y responde. Así todo se puede probar.
5. Nada de `print` para registrar lo que pasa: usar `logging`.
6. **Pruebas:** `pytest` en `/tests`, archivos `test_*.py`. Cada regla de alerta tiene al menos una prueba que detecta una anomalía de `anomalias_esperadas.csv` y otra que **no** alerta en un caso de control.
7. Al convertir resultados a JSON, reemplazar `NaN` por `None` y redondear el dinero a 2 decimales al final.

### 9. Código TypeScript y React (frontend)

1. React con componentes de función y hooks. TypeScript en modo estricto; prohibido `any`.
2. **Una sola puerta a la API:** todas las peticiones pasan por `frontend/api.ts`, que también define los tipos de las respuestas. La URL de la API se lee de `import.meta.env.VITE_API_URL` (archivo `.env.local`, no se sube a GitHub).
3. **El frontend no calcula cifras de negocio:** solo muestra lo que manda la API. Puede formatear (pesos, fechas, porcentajes), pero no sumar ni recalcular.
4. **Formatos en pantalla** (una sola función para cada uno, en `frontend/formato.ts`):
   - Pesos: `$1,234,567.89` → `n.toLocaleString("es-MX", { style: "currency", currency: "MXN" })`
   - Porcentajes: `2.0%` (1 decimal en pantalla)
   - Fechas: `19 oct 2026` (`es-MX`)
5. **Colores de severidad** iguales en toda la aplicación: crítica `#C62828`, alta `#E8A33D`, media `#F2C94C`.
6. Gráficas con Recharts, dentro de `frontend/components/charts` (territorio de Armando).
7. Formatear con `npm run format` antes de cada commit; la página no debe tener errores en `npm run typecheck`.

### 10. Capa de IA del producto (Omar)

1. La IA **solo** recibe tablas ya calculadas por el motor (alertas, KPIs, proyecciones). Nunca calcula cifras ni las inventa.
2. Si una pregunta no se puede responder con los datos, lo dice ("No tengo datos para responder eso") en lugar de adivinar.
3. Cada respuesta indica de qué datos salió (por ejemplo, `"fuentes": ["/api/alertas"]`).
4. El resumen ejecutivo tiene exactamente **3 viñetas**, en español, con cifras tal como vienen del motor.
5. La clave del modelo de lenguaje va en `.env` (por ejemplo `ANTHROPIC_API_KEY` u `OPENAI_API_KEY`), nunca en el código.

### 11. Git y trabajo en equipo

1. **Nadie sube cambios directo a `main`.** Cada quien trabaja en su rama `nombre/tema` (por ejemplo `alex/tablero`, `patrick/conciliacion`) y abre un Pull Request; Omar revisa y fusiona.
2. Antes de empezar: `git pull origin main` y actualizar tu rama.
3. **Mensajes de commit** en español, en presente y con un prefijo de tipo:
   `feat:` (función nueva) · `fix:` (corrección) · `docs:` (documentación) · `datos:` (dataset) · `test:` (pruebas) · `refactor:` (reordenar código sin cambiar lo que hace).
   Ejemplo: `feat(alertas): agrega regla de gasto atípico contra la mediana de tiendas similares`
4. Commits pequeños y frecuentes. Nunca se suben `node_modules`, `.venv`, `.env`, contraseñas ni archivos pesados.
5. Si hay un conflicto al fusionar, la IA **no** lo resuelve borrando el código de otro: se le pregunta a la persona dueña de ese territorio.
6. El sábado, a las **3:45 pm** se congela la versión de la demo: después de esa hora solo se corrigen errores graves.

### 12. Lo que la IA NUNCA debe hacer

1. Inventar cifras, columnas, rutas, datos de ejemplo o resultados de pruebas.
2. Cambiar nombres del contrato (columnas, campos JSON, rutas) sin que este archivo se actualice primero.
3. Modificar archivos fuera del territorio de su persona sin preguntar.
4. Usar `float` para sumar dinero o redondear antes del final.
5. Escribir contraseñas, tokens o claves en el código, en GitHub o en el chat del equipo.
6. Borrar o modificar datos de la base de datos (`DELETE`, `UPDATE`, `DROP`) sin autorización de Omar.
7. Desactivar validaciones o pruebas para que algo "funcione".
8. Agregar librerías o frameworks nuevos sin explicar por qué y sin avisar al equipo.
9. Reescribir un archivo completo cuando basta un cambio pequeño.
10. Responder con seguridad cuando no está segura: si falta información, debe preguntar.

### 13. Prompt de arranque (cópialo al iniciar cada sesión con tu IA)

```
Eres parte del equipo "Pulso Financiero 3B" del 2° Hackatón Tiendas 3B (Reto 7: control financiero
y flujo de efectivo por tienda). Te adjunto CONTEXT.md: síguelo al pie de la letra, sobre todo la
sección "REGLAS PARA LAS IA".
Mi nombre es <TU NOMBRE>, mi rol es <TU ROL> y mi territorio es <TUS CARPETAS> (sección 2).
Antes de escribir código: dime qué archivos vas a crear o cambiar y confirma que están en mi territorio.
Usa los nombres del glosario (4.4), dinero en centavos (5.4) y los umbrales de /motor/parametros.py (6).
Si algo no está definido en CONTEXT.md, pregúntame en lugar de inventarlo.
```

### 14. Lista de revisión antes de abrir un Pull Request

- [ ] El código corre en mi computadora sin errores.
- [ ] Pasan las pruebas (`pytest`) o la revisión de tipos (`npm run typecheck`), según corresponda.
- [ ] Usé los nombres del glosario y los formatos de fechas, dinero y porcentajes de este documento.
- [ ] Revisé a mano al menos una cifra contra el dataset y cuadra al centavo.
- [ ] Si cambié el contrato (columnas, campos o rutas), ya está actualizado aquí y avisé en el chat.
- [ ] No hay claves, tokens ni archivos `.env` en el commit.
- [ ] Solo modifiqué archivos de mi territorio.



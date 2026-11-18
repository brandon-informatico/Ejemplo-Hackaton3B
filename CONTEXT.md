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

ARQUITECTURA (Omar)
Un solo Cloudflare Worker sirve la página web y la API en la misma URL; los datos viven en una base D1 (SQLite).
  App:   https://pulso-financiero-3b.1011estudio-ia.workers.dev
  API:   https://pulso-financiero-3b.1011estudio-ia.workers.dev/api
Detalle, comandos, costos y límites: docs/infra/README.md

TERRITORIOS EN EL REPOSITORIO
  /frontend, index.html       Alex (interfaz)  ·  /frontend/components/charts → Armando (gráficas)
  /api                        Alejandro (rutas, reglas, proyección) y Patrick (KPIs y conciliación)
  /api/rutas/maqueta.ts       ejemplos temporales: se reemplazan por el motor real
  /data, /migrations          Omar (datos y esquema)
  cloudflare.config.ts        Omar y Armando (nube)
  /docs                       guías: docs/frontend (conexión) y docs/infra (nube)

CONTRATO DE DATOS
Tablas (modelo en estrella; diccionario completo en data/README.md):
  tiendas(tienda_id, nombre, region, ciudad, formato, fecha_apertura, m2)
  productos(producto_id, nombre, categoria, marca_propia, precio_lista, costo)
  categorias_gasto(categoria, nombre, tipo)
  ventas_pos(fecha, tienda_id, venta, tickets)                         diario
  depositos(fecha_venta, tienda_id, fecha_deposito, monto, referencia) diario
  gastos(mes, tienda_id, categoria, monto)                             mensual
  ventas_producto(mes, tienda_id, producto_id, unidades, venta, costo) mensual
Formatos: fechas AAAA-MM-DD; meses AAAA-MM; montos en pesos con 2 decimales en CSV y JSON,
centavos (enteros) dentro de la base. Sin nulos, sin duplicados, con llaves foráneas.
Regla de cuadre: por tienda y mes, suma de ventas_producto.venta = suma de ventas_pos.venta.
Origen de los datos de práctica (reales vs simulados): data/FUENTES.md

CONTRATO DE API (detalle y ejemplos JSON en docs/frontend/README.md)
  GET  /api/kpis?region=&tienda=&desde=&hasta=     tarjetas: ventas, gastos, margen, diferencia de efectivo
  GET  /api/ventas?...&agrupar=dia|semana|mes      venta POS vs depósito
  GET  /api/gastos?...&categoria=                  gasto mensual por categoría
  GET  /api/productos/top?...&limite=              productos con más demanda
  GET  /api/tiendas · /api/filtros · /api/salud
  GET  /api/alertas                                MAQUETA (Alejandro + Armando)
  GET  /api/proyecciones/{tienda}                  MAQUETA (Alejandro)
  GET  /api/ai/resumen-ejecutivo · POST /api/ai/preguntar   MAQUETA (Omar)
  POST /api/admin/cargar                           carga de CSV, requiere clave
Convenciones: listas = { filtros, total, datos: [...] }; errores = { error: "..." }.
Si alguien cambia un campo o una ruta, lo avisa en el chat del equipo ANTES de subirlo.

REGLAS PARA LAS IA:



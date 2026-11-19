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

ESTADO ACTUAL
  Página web publicada (sitio estático en Cloudflare): https://pulso-financiero-3b.1011estudio-ia.workers.dev
  Dataset limpio y normalizado: carpeta /dataset
  Base de datos con el dataset cargado: Cloudflare D1 "pulso-financiero-db" (montos en centavos)
  Backend (API y cálculos): pendiente, lo construye el equipo de backend.
Manual de la base para backend: docs/backend/README.md
Detalle del servidor: docs/infra/README.md · Guía del front: docs/frontend/README.md

TERRITORIOS EN EL REPOSITORIO
  /dataset                    Omar (datos limpios y normalizados)
  /frontend, index.html       Alex (interfaz)  ·  /frontend/components/charts → Armando (gráficas)
  backend (carpetas por crear) Patrick (conciliación) y Alejandro (alertas, proyección, API, pruebas)
  cloudflare.config.ts        Omar y Armando (nube)
  /docs                       guías: docs/frontend y docs/infra

CONTRATO DE DATOS (Omar)
Archivos CSV en /dataset/csv (modelo en estrella; diccionario completo en dataset/README.md):
  tiendas(tienda_id, nombre, region, ciudad, formato, fecha_apertura, m2)              catálogo
  productos(producto_id, nombre, categoria, marca_propia, precio_lista, costo)        catálogo
  ventas_pos(fecha, tienda_id, venta, tickets)                                        diario
  depositos(fecha_venta, tienda_id, fecha_deposito, monto, referencia)                diario
  gastos(mes, tienda_id, categoria, monto)                                            mensual
  ventas_producto(mes, tienda_id, producto_id, unidades, venta, costo)                mensual
Categorías de gasto válidas: renta, luz, nomina, mantenimiento, merma.
Formatos: fechas AAAA-MM-DD; meses AAAA-MM; montos en pesos con 2 decimales (sin $ ni comas).
Sin nulos, sin duplicados; toda tienda y producto referenciado existe en su catálogo.
Regla de cuadre: por tienda y mes, suma de ventas_producto.venta = suma de ventas_pos.venta.
Origen de los datos de práctica (reales vs simulados): dataset/FUENTES.md

CONTRATO DE API
Pendiente: lo definen backend y frontend juntos y lo anotan aquí antes de programar.
Si alguien cambia un campo o una ruta, lo avisa en el chat del equipo ANTES de subirlo.

REGLAS PARA LAS IA:



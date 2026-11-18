# Datos · Pulso Financiero 3B

Territorio de **Omar** (ingesta y limpieza). De dónde salen los datos: [FUENTES.md](FUENTES.md).

## Archivos

| Archivo | Qué es |
|---|---|
| `generar_datos.py` | Crea los CSV de práctica (30 tiendas, mayo–octubre 2026). Misma semilla = mismos datos para todos. |
| `cargar_datos.py` | Sube los CSV a la base (local o nube) por la API, en el orden correcto. |
| `csv/*.csv` | Dataset listo (UTF-8, separado por comas, con encabezado). |
| `csv/anomalias_esperadas.csv` | **Hoja de respuestas** para QA: qué anomalías se sembraron y cuáles NO deben alertar. No se carga a la base. |

## Modelo de datos (en estrella, normalizado)

```
            tiendas ─────────┬──────────────┬───────────────┬────────────────┐
           (catálogo)        │              │               │                │
                         ventas_pos     depositos        gastos ── categorias_gasto
                          (diario)       (diario)       (mensual)     (catálogo)
                                                                         
            productos ── ventas_producto (mensual)  ← también usa tiendas
           (catálogo)
```

Reglas de limpieza que cumple el dataset (y que valida la API al cargar):

- Sin celdas vacías ni duplicados (cada tabla tiene llave primaria).
- Toda venta, depósito o gasto apunta a una tienda que existe; todo producto vendido existe en el catálogo (llaves foráneas).
- Fechas `AAAA-MM-DD`, meses `AAAA-MM`, montos `1234.56` (sin `$` ni comas), enteros sin decimales.
- Montos en pesos en el CSV; la base los guarda en centavos para que todo cuadre al centavo.
- **Cuadre**: por tienda y mes, la suma de `ventas_producto.venta` = la suma de `ventas_pos.venta`.

## Diccionario de datos

### tiendas.csv
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| tienda_id | texto | T08 | Identificador único |
| nombre | texto | Tienda 08 | Nombre para mostrar |
| region | texto | Sur | Centro, Norte, Sur, Occidente, Bajío |
| ciudad | texto | Oaxaca | Ciudad |
| formato | texto | Estándar | Compacta, Estándar, Plus |
| fecha_apertura | fecha | 2026-07-06 | Si es posterior al 2026-05-01 es tienda nueva |
| m2 | entero | 400 | Superficie de piso de venta |

### ventas_pos.csv (una fila por tienda y día)
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| fecha | fecha | 2026-10-19 | Día de la venta |
| tienda_id | texto | T08 | → tiendas |
| venta | pesos | 78355.50 | Total cobrado en caja ese día |
| tickets | entero | 522 | Número de compras |

### depositos.csv (una fila por tienda y día de venta)
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| fecha_venta | fecha | 2026-10-19 | Día de la venta que se deposita |
| tienda_id | texto | T08 | → tiendas |
| fecha_deposito | fecha | 2026-10-20 | Día en que el banco lo confirmó (normalmente el día siguiente) |
| monto | pesos | 76068.58 | Monto confirmado por el banco (aquí faltan $2,286.92: es la anomalía A1) |
| referencia | texto | DEP-T08-20261019 | Referencia bancaria |

Si falta la fila de un día, el banco no confirmó depósito de ese día.

### gastos.csv (una fila por tienda, mes y categoría)
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| mes | mes | 2026-10 | Mes del gasto |
| tienda_id | texto | T12 | → tiendas |
| categoria | texto | luz | renta, luz, nomina, mantenimiento, merma |
| monto | pesos | 44942.83 | Gasto del mes (proporcional en el mes de apertura) |

### productos.csv
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| producto_id | texto | P001 | Identificador único |
| nombre | texto | Leche entera 1 L | Descripción |
| categoria | texto | Lácteos | Familia de producto |
| marca_propia | 0/1 | 1 | 1 = marca propia de la cadena |
| precio_lista | pesos | 23.50 | Precio de referencia al inicio del periodo |
| costo | pesos | 19.04 | Costo unitario de referencia |

### ventas_producto.csv (una fila por tienda, mes y producto)
| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| mes | mes | 2026-10 | Mes |
| tienda_id | texto | T08 | → tiendas |
| producto_id | texto | P001 | → productos |
| unidades | entero | 9359 | Piezas vendidas |
| venta | pesos | 223811.75 | Venta del producto |
| costo | pesos | 181104.27 | Costo de lo vendido |

## Anomalías sembradas (resumen de `csv/anomalias_esperadas.csv`)

| id | Tienda | Qué pasa | ¿Debe alertar? |
|---|---|---|---|
| A1 | T08 (Sur) | Faltante de depósito de 2.0% en la semana del 19 oct (caso del reto) | Sí, crítica |
| A2 | T17 | El banco no confirmó el depósito del 12 sep | Sí, crítica |
| A3 | T04 | Faltante de 0.7% (más de 0.5% pero menos de $5,000) | Sí, alta |
| A4 | T12 (Norte) | Luz de octubre +34% contra su promedio de 3 meses (caso del reto) | Sí, alta |
| A5 | T05 | Mantenimiento de septiembre 4.2 veces su promedio | Sí, alta |
| A6 | T19 | Merma de agosto en 2.6% de la venta | Sí, crítica |
| A7 | T21 (Sur, nueva) | Tienda nueva lenta: llega tarde a su punto de equilibrio | Sí, media |
| C1 | T13 | Depósito completo pero 4 días tarde | **No** (no es faltante) |
| C2 | T23 | Faltantes de 0.3% semanales (debajo del umbral) | **No** |
| C3 | Occidente | Luz +30% en TODAS sus tiendas en octubre (tarifa) | **No** (no es atípico contra tiendas similares) |
| C4 | T09 | Luz +18% (debajo de 25%) | **No** |

Además hay diferencias normales de unos pesos en ~6% de los depósitos (monedas, redondeos) que no deben alertar.
Alejandro puede usar esta tabla para medir aciertos y **falsas alarmas** de las reglas.

## El sábado, con los datos oficiales

1. Revisar las columnas de los CSV de 3B y compararlas con este diccionario.
2. Adaptar (limpiar fechas, nulos, nombres de columnas) para que queden con estas mismas columnas.
3. `cargar_datos.py` rechaza el archivo completo si encuentra una fila sucia y dice la línea exacta del problema.

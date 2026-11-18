# Fuentes del dataset: qué es real y qué es simulado

**Resumen:** Tiendas 3B no publica datos diarios por tienda (ventas, depósitos, gastos). Lo que sí publica, porque cotiza en la bolsa de Nueva York como BBB Foods Inc. (NYSE: TBBB), son **cifras agregadas trimestrales**. El dataset usa esas cifras **reales** como parámetros y **simula** los registros por tienda para que, sumados, se parezcan a la realidad de 3B.

## Búsqueda realizada (18 nov 2026)

| Fuente buscada | Resultado |
|---|---|
| Datos por tienda de Tiendas 3B | No existen públicamente. |
| Reportes trimestrales de 3B (SEC / relación con inversionistas) | ✅ Usados para calibrar (ver tabla abajo). |
| PROFECO "Quién es Quién en los Precios" (precios reales por cadena, datos abiertos en datos.gob.mx) | Existe (CSV mensuales 2025), pero el servidor rechaza descargas automáticas (error 403). Se puede bajar a mano desde el navegador si el equipo quiere precios reales. |
| INEGI DENUE (directorio de negocios, incluye sucursales 3B) | Requiere descarga masiva o registro para su API. No se usó. |
| OpenStreetMap (ubicaciones de tiendas 3B) | El servicio de consultas no respondió (sobrecargado). No se usó. |

## Cifras REALES usadas como parámetros

| Parámetro | Valor | Fuente |
|---|---|---|
| Margen bruto | 16.7% de los ingresos | 3B, reporte 3T26 |
| Gastos de venta (operación de tiendas) | 9.8% de los ingresos | 3B, reporte 3T26 |
| Renta (pagos de arrendamiento) | 2.2% de los ingresos (Ps 638 M / Ps 28,445 M) | 3B, reporte 3T26 |
| Crecimiento ventas mismas tiendas | 20.5% anual | 3B, reporte 3T26 |
| Venta por tienda | ≈ Ps 82 mil al día (Ps 28,445 M / 3,765 tiendas / 92 días) | cálculo propio con el reporte 3T26 |
| Crecimiento de la red | 19.1% anual (603 tiendas netas en 12 meses; 141 en el trimestre) | 3B, reporte 3T26 |
| Marca propia | 58.2% de los ingresos | 3B, reporte 4T25 / anual 2025 |

Documentos:
- [Reporte de resultados 3T26 (SEC, formulario 6-K)](https://www.sec.gov/Archives/edgar/data/0001978954/000119312526443746/6k_tbbb_3q26_earnings_re.htm)
- [Reporte de resultados 3T26 (PDF de 3B)](https://s203.q4cdn.com/155743495/files/content_files/Earnings-Release-3Q26.pdf)
- [Resumen 3T26 en Business Wire / Morningstar](https://www.morningstar.com/news/business-wire/20261030251364/tiendas-3b-3q26-earnings-release)
- [Catálogo de datos abiertos de PROFECO (QQP 2025)](https://www.datos.gob.mx/dataset/programa_quien_es_quien_precios_2025)

## Resultado de la calibración

Lo imprime `python data/generar_datos.py` cada vez que se genera:

| Indicador | Dataset | Real 3B |
|---|---|---|
| Venta diaria de una tienda madura | ≈ Ps 87.7 mil | ≈ Ps 82 mil (promedio de toda la red, incluye tiendas nuevas) |
| Margen bruto | 17.0% | 16.7% |
| Renta / venta | 2.2% | 2.2% |
| Luz + nómina + mantenimiento + merma / venta | 8.6% | 9.8% (los gastos de venta reales incluyen otros conceptos que el reto no pide) |
| Marca propia / venta | 57.9% | 58.2% |

## Supuestos SIMULADOS (razonables, no publicados por 3B)

- 30 tiendas ficticias en 5 regiones (Centro, Norte, Sur, Occidente, Bajío) y 3 formatos. Ciudades reales, pero **no** son sucursales reales de 3B.
- Ticket promedio ≈ Ps 150; personal por tienda 9–14 personas a Ps 13,200 al mes con cargas sociales.
- Luz ≈ Ps 72 por m² al mes, más cara en verano en regiones cálidas.
- Patrón semanal (sábado más alto), quincenas (+8%) y días festivos (15 de septiembre, 10 de mayo).
- Tiendas nuevas arrancan vendiendo ≈ 55% de una tienda madura y maduran en ≈ 2 años.
- 40 productos representativos (de ≈ 800 que maneja 3B según análisis de terceros); entre los 40 suman el 100% de la venta. Precios de referencia 2026, inflación 0.35% mensual y alza de 12% en huevo desde agosto.
- Anomalías sembradas a propósito: ver `csv/anomalias_esperadas.csv`.

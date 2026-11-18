"""
Generador del dataset de práctica · Pulso Financiero 3B
=======================================================

Crea CSV limpios y normalizados (modelo en estrella) en data/csv/:

  DIMENSIONES  tiendas.csv, productos.csv
  HECHOS       ventas_pos.csv, depositos.csv, gastos.csv, ventas_producto.csv
  QA           anomalias_esperadas.csv  (hoja de respuestas: NO se carga a la base)

¿Qué es real y qué es simulado?  -> ver data/FUENTES.md
  * Los PARÁMETROS vienen de los reportes públicos de Tiendas 3B (BBB Foods, NYSE: TBBB):
    venta por tienda, margen bruto, gastos de tienda, renta, crecimiento de ventas
    mismas tiendas, ritmo de aperturas y participación de marca propia.
  * Los REGISTROS diarios por tienda son SIMULADOS: 3B no publica datos por tienda.

Uso (desde la carpeta del proyecto):
    python data/generar_datos.py                 # 30 tiendas, mayo-octubre 2026
    python data/generar_datos.py --tiendas 60    # más datos para pruebas de volumen
Solo usa la biblioteca estándar de Python (no hay que instalar nada).
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. PARÁMETROS REALES (fuente: reportes trimestrales de Tiendas 3B, ver FUENTES.md)
# ---------------------------------------------------------------------------
REAL_MARGEN_BRUTO = 0.167          # 3T26: utilidad bruta / ingresos
REAL_GASTOS_VENTA_PCT = 0.098      # 3T26: gastos de venta (operación de tiendas) / ingresos
REAL_RENTA_PCT = 0.022             # 3T26: pagos de arrendamiento (Ps 638 M) / ingresos (Ps 28,445 M)
REAL_SSS_ANUAL = 0.205             # 3T26: crecimiento de ventas mismas tiendas
REAL_VENTA_TIENDA_DIA = 82_000     # 3T26: Ps 28,445 M / 3,765 tiendas / 92 días ≈ Ps 82 mil
REAL_MARCA_PROPIA = 0.582          # 2025: participación de marca propia en ingresos
REAL_CRECIMIENTO_TIENDAS = 0.191   # 3T26: crecimiento anual de la base de tiendas

# ---------------------------------------------------------------------------
# 2. SUPUESTOS SIMULADOS (razonables, no publicados por 3B)
# ---------------------------------------------------------------------------
FORMATOS = {  # venta diaria base de una tienda madura, m2, empleados
    "Compacta": {"venta": 66_000, "m2": 300, "empleados": 9},
    "Estándar": {"venta": 83_000, "m2": 400, "empleados": 12},
    "Plus": {"venta": 102_000, "m2": 500, "empleados": 14},
}
REGIONES = {  # factor de venta, factor de renta, ¿clima cálido?
    "Centro": {"venta": 1.05, "renta": 1.15, "calido": False},
    "Norte": {"venta": 1.00, "renta": 1.05, "calido": True},
    "Sur": {"venta": 0.92, "renta": 0.90, "calido": True},
    "Occidente": {"venta": 1.00, "renta": 1.00, "calido": False},
    "Bajío": {"venta": 0.97, "renta": 0.95, "calido": False},
}
TICKET_PROMEDIO = 152.0            # Ps por compra (supuesto)
COSTO_EMPLEADO_MES = 13_200        # Ps: salario + cargas sociales (supuesto, 2026)
LUZ_POR_M2 = 72.0                  # Ps por m2 al mes (supuesto)
MERMA_PCT = 0.009                  # 0.9% de la venta (supuesto)
MANTENIMIENTO_PCT = 0.0035         # 0.35% de la venta (supuesto)
DIA_SEMANA = [0.93, 0.92, 0.95, 0.97, 1.06, 1.15, 1.02]  # lunes..domingo (promedio = 1)

# Tiendas: (id, región, ciudad, formato, fecha de apertura o None = aleatoria antigua)
TIENDAS = [
    ("T01", "Centro", "Ciudad de México", "Estándar", None),
    ("T02", "Norte", "Monterrey", "Plus", None),
    ("T03", "Sur", "Villahermosa", "Estándar", None),
    ("T04", "Occidente", "Guadalajara", "Estándar", None),
    ("T05", "Bajío", "León", "Plus", None),
    ("T06", "Centro", "Ecatepec", "Plus", None),
    ("T07", "Norte", "Saltillo", "Compacta", None),
    ("T08", "Sur", "Oaxaca", "Estándar", None),
    ("T09", "Occidente", "Zapopan", "Compacta", None),
    ("T10", "Bajío", "Querétaro", "Estándar", None),
    ("T11", "Centro", "Puebla", "Estándar", None),
    ("T12", "Norte", "San Luis Potosí", "Estándar", None),
    ("T13", "Sur", "Mérida", "Plus", None),
    ("T14", "Occidente", "Morelia", "Estándar", None),
    ("T15", "Bajío", "Aguascalientes", "Compacta", None),
    ("T16", "Centro", "Toluca", "Compacta", None),
    ("T17", "Norte", "Torreón", "Estándar", None),
    ("T18", "Sur", "Tuxtla Gutiérrez", "Compacta", None),
    ("T19", "Occidente", "Colima", "Estándar", None),
    ("T20", "Bajío", "Irapuato", "Estándar", None),
    ("T21", "Sur", "Veracruz", "Estándar", date(2026, 7, 6)),
    ("T22", "Norte", "Chihuahua", "Plus", None),
    ("T23", "Sur", "Xalapa", "Estándar", None),
    ("T24", "Occidente", "Tepic", "Compacta", date(2026, 1, 12)),
    ("T25", "Bajío", "Celaya", "Estándar", date(2026, 3, 9)),
    ("T26", "Centro", "Pachuca", "Estándar", date(2026, 5, 18)),
    ("T27", "Occidente", "Tlaquepaque", "Estándar", date(2026, 6, 22)),
    ("T28", "Bajío", "Salamanca", "Compacta", date(2026, 8, 17)),
    ("T29", "Norte", "Ciudad Victoria", "Estándar", date(2026, 9, 14)),
    ("T30", "Centro", "Cuernavaca", "Compacta", date(2026, 10, 5)),
]

# Productos: (id, nombre, categoría, marca_propia, precio Ps, margen, peso en la venta)
PRODUCTOS = [
    ("P001", "Leche entera 1 L", "Lácteos", 1, 23.50, 0.19, 8.0),
    ("P002", "Huevo blanco 18 piezas", "Huevo", 0, 62.00, 0.10, 7.0),
    ("P003", "Pan blanco de caja 680 g", "Panadería", 1, 38.00, 0.23, 3.5),
    ("P004", "Refresco de cola 3 L", "Bebidas", 0, 46.00, 0.10, 6.0),
    ("P005", "Agua purificada 1.5 L", "Bebidas", 1, 9.50, 0.26, 3.5),
    ("P006", "Papel higiénico 12 rollos", "Limpieza", 1, 72.00, 0.22, 4.5),
    ("P007", "Detergente en polvo 1 kg", "Limpieza", 1, 29.00, 0.24, 2.5),
    ("P008", "Aceite vegetal 900 ml", "Abarrotes", 1, 34.00, 0.18, 3.0),
    ("P009", "Arroz súper extra 900 g", "Abarrotes", 1, 26.00, 0.20, 2.0),
    ("P010", "Frijol negro 900 g", "Abarrotes", 1, 32.00, 0.20, 2.2),
    ("P011", "Azúcar estándar 1 kg", "Abarrotes", 1, 29.50, 0.15, 2.0),
    ("P012", "Café soluble 120 g", "Abarrotes", 0, 72.00, 0.12, 1.6),
    ("P013", "Atún en agua 130 g", "Abarrotes", 1, 17.50, 0.22, 2.2),
    ("P014", "Galletas tipo María 600 g", "Botanas y galletas", 1, 28.00, 0.24, 1.8),
    ("P015", "Yogurt bebible de fresa 1 L", "Lácteos", 1, 27.00, 0.22, 2.4),
    ("P016", "Queso panela 400 g", "Lácteos", 0, 58.00, 0.11, 2.0),
    ("P017", "Jamón de pavo 250 g", "Salchichonería", 1, 34.00, 0.23, 1.8),
    ("P018", "Salchicha de pavo 500 g", "Salchichonería", 1, 36.00, 0.23, 1.6),
    ("P019", "Pasta para sopa 200 g", "Abarrotes", 1, 7.50, 0.27, 1.2),
    ("P020", "Mayonesa 390 g", "Abarrotes", 0, 39.00, 0.11, 1.4),
    ("P021", "Chiles jalapeños en lata 220 g", "Abarrotes", 0, 17.00, 0.12, 0.9),
    ("P022", "Puré de tomate 210 g", "Abarrotes", 1, 8.00, 0.26, 0.9),
    ("P023", "Cloro 950 ml", "Limpieza", 1, 13.00, 0.27, 1.2),
    ("P024", "Suavizante de telas 850 ml", "Limpieza", 1, 22.00, 0.25, 1.1),
    ("P025", "Servilletas 500 piezas", "Limpieza", 1, 32.00, 0.24, 0.9),
    ("P026", "Papas fritas con sal 170 g", "Botanas y galletas", 0, 44.00, 0.12, 2.6),
    ("P027", "Jugo de naranja 1 L", "Bebidas", 1, 21.00, 0.23, 1.5),
    ("P028", "Avena en hojuelas 400 g", "Abarrotes", 1, 19.00, 0.24, 0.9),
    ("P029", "Cereal de maíz azucarado 500 g", "Abarrotes", 0, 52.00, 0.11, 2.0),
    ("P030", "Harina de maíz 1 kg", "Abarrotes", 0, 22.00, 0.09, 2.0),
    ("P031", "Leche en polvo entera 800 g", "Lácteos", 0, 135.00, 0.10, 2.4),
    ("P032", "Croquetas para perro adulto 4 kg", "Mascotas", 1, 129.00, 0.21, 2.6),
    ("P033", "Pañal etapa 4, 40 piezas", "Bebés", 1, 159.00, 0.20, 3.0),
    ("P034", "Shampoo 750 ml", "Higiene personal", 0, 59.00, 0.12, 1.8),
    ("P035", "Jabón de tocador 3 piezas", "Higiene personal", 1, 29.00, 0.25, 1.0),
    ("P036", "Pasta dental 100 ml", "Higiene personal", 0, 26.00, 0.12, 1.3),
    ("P037", "Cerveza clara lata 355 ml, 6 piezas", "Cerveza", 0, 105.00, 0.09, 6.2),
    ("P038", "Consomé de pollo en cubos, 12 piezas", "Abarrotes", 0, 16.00, 0.11, 0.9),
    ("P039", "Margarina 225 g", "Lácteos", 1, 18.00, 0.24, 0.8),
    ("P040", "Galletas saladas 450 g", "Botanas y galletas", 0, 33.00, 0.11, 1.4),
]
CATEGORIAS_GASTO = ["renta", "luz", "nomina", "mantenimiento", "merma"]


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def pesos(centavos: int) -> str:
    """42000050 -> '420000.50' (sin flotantes, para que todo cuadre al centavo)."""
    signo = "-" if centavos < 0 else ""
    c = abs(centavos)
    return f"{signo}{c // 100}.{c % 100:02d}"


def a_centavos(valor_pesos: float) -> int:
    return int(round(valor_pesos * 100))


def meses_entre(inicio: date, fin: date) -> list[str]:
    meses, a, m = [], inicio.year, inicio.month
    while (a, m) <= (fin.year, fin.month):
        meses.append(f"{a}-{m:02d}")
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return meses


def dias_del_mes(mes: str) -> int:
    a, m = map(int, mes.split("-"))
    sig = date(a + (m == 12), 1 if m == 12 else m + 1, 1)
    return (sig - date(a, m, 1)).days


def repartir(total: int, pesos_relativos: list[float]) -> list[int]:
    """Reparte un total entero en partes enteras que suman EXACTAMENTE el total (mayor residuo)."""
    s = sum(pesos_relativos)
    crudos = [total * p / s for p in pesos_relativos]
    partes = [math.floor(x) for x in crudos]
    faltan = total - sum(partes)
    orden = sorted(range(len(crudos)), key=lambda i: crudos[i] - partes[i], reverse=True)
    for i in orden[:faltan]:
        partes[i] += 1
    return partes


def escribir(ruta: Path, encabezado: list[str], filas: list[list]) -> None:
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(encabezado)
        w.writerows(filas)


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------
def generar(n_tiendas: int, inicio: date, fin: date, semilla: int, salida: Path) -> None:
    rnd = random.Random(semilla)
    salida.mkdir(parents=True, exist_ok=True)
    meses = meses_entre(inicio, fin)
    anomalias: list[list] = []

    # ---- Tiendas (si piden más de 30, se agregan tiendas extra antiguas) ----
    tiendas = list(TIENDAS[:n_tiendas])
    regiones = list(REGIONES)
    for i in range(len(tiendas), n_tiendas):
        tiendas.append((f"T{i + 1:02d}", regiones[i % 5], f"Ciudad {i + 1}", "Estándar", None))
    filas_tiendas, info = [], {}
    for tid, region, ciudad, formato, apertura in tiendas:
        if apertura is None:  # tienda antigua: abrió entre 2018 y 2025
            apertura = date(2018, 1, 1) + timedelta(days=rnd.randint(0, 365 * 7 + 300))
        m2 = FORMATOS[formato]["m2"] + rnd.choice([-20, -10, 0, 0, 10, 20])
        info[tid] = {
            "region": region,
            "formato": formato,
            "apertura": apertura,
            "m2": m2,
            "factor": rnd.gauss(1.0, 0.08),
            "ticket": TICKET_PROMEDIO * rnd.gauss(1.0, 0.04),
        }
        filas_tiendas.append([tid, f"Tienda {tid[1:]}", region, ciudad, formato, apertura.isoformat(), m2])
    escribir(salida / "tiendas.csv", ["tienda_id", "nombre", "region", "ciudad", "formato", "fecha_apertura", "m2"], filas_tiendas)

    # ---- Ventas POS diarias ----
    venta_dia: dict[tuple[str, date], int] = {}
    filas_ventas = []
    festivos = {date(2026, 5, 10): 1.06, date(2026, 9, 15): 1.12, date(2026, 9, 16): 0.95}
    crecimiento_diario = (1 + REAL_SSS_ANUAL) ** (1 / 365) - 1
    d = inicio
    while d <= fin:
        for tid, t in info.items():
            if d < t["apertura"]:
                continue
            edad_meses = (d - t["apertura"]).days / 30.4
            rampa = 1 - 0.45 * math.exp(-edad_meses / 7)  # tienda nueva: arranca ~55% y madura en ~2 años
            quincena = 1.08 if d.day in (1, 15, 16) or (d + timedelta(days=1)).day == 1 else 1.0
            base = FORMATOS[t["formato"]]["venta"] * REGIONES[t["region"]]["venta"] * t["factor"]
            v = (
                base
                * rampa
                * (1 + crecimiento_diario) ** (d - inicio).days
                * DIA_SEMANA[d.weekday()]
                * quincena
                * festivos.get(d, 1.0)
                * rnd.gauss(1.0, 0.04)
            )
            cent = a_centavos(v)
            tickets = max(1, round(v / (t["ticket"] * rnd.gauss(1.0, 0.03))))
            venta_dia[(tid, d)] = cent
            filas_ventas.append([d.isoformat(), tid, pesos(cent), tickets])
        d += timedelta(days=1)
    escribir(salida / "ventas_pos.csv", ["fecha", "tienda_id", "venta", "tickets"], filas_ventas)

    # ---- Depósitos bancarios (normalmente: la venta del día se deposita al día siguiente) ----
    deposito = {k: v for k, v in venta_dia.items()}
    fecha_dep = {}
    for (tid, dv) in venta_dia:
        fd = dv + timedelta(days=1)
        if fd.weekday() == 6:  # domingo: el banco lo confirma el lunes
            fd += timedelta(days=1)
        fecha_dep[(tid, dv)] = fd
        if rnd.random() < 0.06:  # diferencias normales de centavos/monedas (no deben alertar)
            deposito[(tid, dv)] += rnd.randint(-4000, 1500)

    def semana(tid: str, lunes: date) -> list[date]:
        return [lunes + timedelta(days=i) for i in range(7) if (tid, lunes + timedelta(days=i)) in venta_dia]

    def faltante(tid: str, dias: list[date], pct: float) -> int:
        total_semana = sum(venta_dia[(tid, x)] for x in semana(tid, dias[0] - timedelta(days=dias[0].weekday())))
        objetivo = round(total_semana * pct)
        for x, parte in zip(dias, repartir(objetivo, [rnd.uniform(0.7, 1.3) for _ in dias])):
            deposito[(tid, x)] = venta_dia[(tid, x)] - parte
        return objetivo

    # A1: faltante crítico (caso del reto): T08, 5 días, 2% de la venta semanal
    dias = [date(2026, 10, 19) + timedelta(days=i) for i in range(5)]
    m = faltante("T08", dias, 0.020)
    anomalias.append(["A1", "faltante_deposito", "T08", "2026-10-19", "2026-10-25", "", pesos(m), "si", "critica",
                      "Faltante de 2.0% de la venta semanal repartido en 5 días (supera 0.5% y $5,000)"])
    # A2: depósito de un día completo que nunca llegó
    dia = date(2026, 9, 12)
    m = venta_dia[("T17", dia)]
    del deposito[("T17", dia)]
    anomalias.append(["A2", "deposito_no_confirmado", "T17", dia.isoformat(), dia.isoformat(), "", pesos(m), "si", "critica",
                      "El banco no confirmó el depósito de todo un día"])
    # A3: faltante moderado (supera 0.5% pero no $5,000)
    dias = [date(2026, 8, 4), date(2026, 8, 6)]
    m = faltante("T04", dias, 0.007)
    anomalias.append(["A3", "faltante_deposito", "T04", "2026-08-03", "2026-08-09", "", pesos(m), "si", "alta",
                      "Faltante de 0.7% de la venta semanal (supera 0.5% pero no $5,000)"])
    # C1: depósito tardío pero completo (control: NO es faltante)
    fecha_dep[("T13", date(2026, 7, 14))] = date(2026, 7, 18)
    anomalias.append(["C1", "deposito_tardio", "T13", "2026-07-14", "2026-07-14", "", "0.00", "no", "",
                      "Depósito completo que llegó 4 días tarde: no debe marcarse como faltante"])
    # C2: faltantes pequeños constantes por debajo del umbral (control)
    lunes = date(2026, 9, 7)
    for k in range(3):
        faltante("T23", [lunes + timedelta(days=7 * k + 1)], 0.003)
    anomalias.append(["C2", "faltante_bajo_umbral", "T23", "2026-09-07", "2026-09-27", "", "", "no", "",
                      "Faltantes semanales de 0.3% (debajo del umbral de 0.5%): no debe alertar"])

    filas_dep = [
        [dv.isoformat(), tid, fecha_dep[(tid, dv)].isoformat(), pesos(monto), f"DEP-{tid}-{dv.strftime('%Y%m%d')}"]
        for (tid, dv), monto in sorted(deposito.items(), key=lambda kv: (kv[0][1], kv[0][0]))
    ]
    escribir(salida / "depositos.csv", ["fecha_venta", "tienda_id", "fecha_deposito", "monto", "referencia"], filas_dep)

    # ---- Venta mensual por tienda (base de gastos y del desglose por producto) ----
    venta_mes: dict[tuple[str, str], int] = defaultdict(int)
    dias_abierta: dict[tuple[str, str], int] = defaultdict(int)
    for (tid, dv), c in venta_dia.items():
        venta_mes[(tid, dv.strftime("%Y-%m"))] += c
        dias_abierta[(tid, dv.strftime("%Y-%m"))] += 1

    # ---- Gastos mensuales por categoría ----
    gastos: dict[tuple[str, str, str], int] = {}
    for tid, t in info.items():
        f, r = FORMATOS[t["formato"]], REGIONES[t["region"]]
        renta = f["venta"] * 30.4 * REAL_RENTA_PCT * r["renta"] * rnd.gauss(1.0, 0.06)
        nomina = f["empleados"] * COSTO_EMPLEADO_MES
        for i, mes in enumerate(meses):
            abiertos = dias_abierta.get((tid, mes), 0)
            if not abiertos:
                continue
            prop = abiertos / dias_del_mes(mes)  # mes de apertura: gasto proporcional
            mm = int(mes[5:])
            if r["calido"]:
                clima = {5: 1.25, 6: 1.28, 7: 1.25, 8: 1.22, 9: 1.12}.get(mm, 1.0)
            else:
                clima = {5: 1.08, 6: 1.06}.get(mm, 1.0)
            gastos[(mes, tid, "renta")] = a_centavos(renta * prop * (1.05 if tid == "T02" and mm >= 8 else 1.0))
            gastos[(mes, tid, "luz")] = a_centavos(t["m2"] * LUZ_POR_M2 * clima * prop * rnd.gauss(1.0, 0.05))
            gastos[(mes, tid, "nomina")] = a_centavos(nomina * prop * rnd.gauss(1.0, 0.02))
            v = venta_mes[(tid, mes)] / 100
            gastos[(mes, tid, "mantenimiento")] = a_centavos(max(1500.0, v * MANTENIMIENTO_PCT * rnd.gauss(1.0, 0.15)))
            gastos[(mes, tid, "merma")] = a_centavos(v * MERMA_PCT * rnd.gauss(1.0, 0.08))

    def prom3(tid: str, cat: str, mes: str) -> float:
        i = meses.index(mes)
        return sum(gastos[(m, tid, cat)] for m in meses[i - 3:i]) / 3

    # A4: luz de T12 (Norte) 34% arriba de su promedio de 3 meses (caso del reto)
    gastos[("2026-10", "T12", "luz")] = round(prom3("T12", "luz", "2026-10") * 1.34)
    anomalias.append(["A4", "gasto_atipico", "T12", "2026-10", "2026-10", "luz", pesos(gastos[("2026-10", "T12", "luz")]), "si", "alta",
                      "Luz +34% contra su promedio de 3 meses y contra tiendas similares"])
    # A5: mantenimiento disparado (reparación de cámara de refrigeración)
    gastos[("2026-09", "T05", "mantenimiento")] = round(prom3("T05", "mantenimiento", "2026-09") * 4.2)
    anomalias.append(["A5", "gasto_atipico", "T05", "2026-09", "2026-09", "mantenimiento", pesos(gastos[("2026-09", "T05", "mantenimiento")]), "si", "alta",
                      "Mantenimiento 4.2 veces su promedio de 3 meses"])
    # A6: merma alta por falla de refrigeración
    gastos[("2026-08", "T19", "merma")] = round(venta_mes[("T19", "2026-08")] * 0.026)
    anomalias.append(["A6", "gasto_atipico", "T19", "2026-08", "2026-08", "merma", pesos(gastos[("2026-08", "T19", "merma")]), "si", "critica",
                      "Merma de 2.6% de la venta (lo normal es ~0.9%)"])
    # C3: alza regional de luz en Occidente (ajuste de tarifa): sube en TODAS sus tiendas -> no es atípico
    for tid, t in info.items():
        if t["region"] == "Occidente" and ("2026-10", tid, "luz") in gastos:
            gastos[("2026-10", tid, "luz")] = round(gastos[("2026-10", tid, "luz")] * 1.30)
    anomalias.append(["C3", "alza_regional", "Occidente", "2026-10", "2026-10", "luz", "", "no", "",
                      "Luz +30% en todas las tiendas de Occidente (tarifa): sube contra su historia pero no contra tiendas similares"])
    # C4: alza moderada debajo del umbral de 25%
    gastos[("2026-09", "T09", "luz")] = round(prom3("T09", "luz", "2026-09") * 1.18)
    anomalias.append(["C4", "gasto_bajo_umbral", "T09", "2026-09", "2026-09", "luz", "", "no", "",
                      "Luz +18% (debajo del umbral de 25%): no debe alertar"])
    # A7: tienda nueva en región de menor venta (su rampa ya la hace lenta; caso para la proyección)
    anomalias.append(["A7", "tienda_nueva_lenta", "T21", "2026-07", "2026-10", "", "", "si", "media",
                      "Tienda nueva en región de menor venta (Sur): su punto de equilibrio llega más tarde que el promedio"])

    escribir(
        salida / "gastos.csv",
        ["mes", "tienda_id", "categoria", "monto"],
        [[mes, tid, cat, pesos(c)] for (mes, tid, cat), c in sorted(gastos.items())],
    )

    # ---- Productos y desglose mensual de venta por producto ----
    escribir(
        salida / "productos.csv",
        ["producto_id", "nombre", "categoria", "marca_propia", "precio_lista", "costo"],
        [[p[0], p[1], p[2], p[3], pesos(a_centavos(p[4])), pesos(a_centavos(p[4] * (1 - p[5])))] for p in PRODUCTOS],
    )
    filas_vp = []
    for (tid, mes), total in sorted(venta_mes.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        region, mm = info[tid]["region"], int(mes[5:])
        i_mes = meses.index(mes)
        pesos_p = []
        for pid, _n, cat, _mp, _precio, _margen, peso in PRODUCTOS:
            w = peso * rnd.gauss(1.0, 0.08)
            if cat in ("Bebidas", "Cerveza") and mm in (5, 6, 7, 8):
                w *= 1.15  # temporada de calor
            if cat == "Cerveza" and region == "Norte":
                w *= 1.30
            if pid == "P005" and REGIONES[region]["calido"]:
                w *= 1.20
            pesos_p.append(w)
        partes = repartir(total, pesos_p)
        for (pid, _n, _cat, _mp, precio, margen, _peso), venta_p in zip(PRODUCTOS, partes):
            inflacion = 1.0035 ** i_mes
            alza = 1.12 if pid == "P002" and mm >= 8 else 1.0  # alza de precio del huevo (alta demanda)
            precio_mes = precio * inflacion * alza
            unidades = max(0, round(venta_p / 100 / precio_mes))
            costo = round(venta_p * (1 - margen * rnd.gauss(1.0, 0.03)))
            filas_vp.append([mes, tid, pid, unidades, pesos(venta_p), pesos(costo)])
    escribir(salida / "ventas_producto.csv", ["mes", "tienda_id", "producto_id", "unidades", "venta", "costo"], filas_vp)

    escribir(
        salida / "anomalias_esperadas.csv",
        ["id", "tipo", "tienda_o_region", "desde", "hasta", "categoria", "monto", "debe_alertar", "severidad_esperada", "descripcion"],
        anomalias,
    )

    # ---------------------------------------------------------------------
    # Revisión de calidad: si algo no cuadra, el script se detiene.
    # ---------------------------------------------------------------------
    ids_t = {f[0] for f in filas_tiendas}
    ids_p = {p[0] for p in PRODUCTOS}
    assert len(ids_t) == len(filas_tiendas), "tienda_id duplicado"
    assert len({(f[0], f[1]) for f in filas_ventas}) == len(filas_ventas), "venta duplicada"
    assert len({(f[0], f[1], f[2]) for f in filas_vp}) == len(filas_vp), "venta por producto duplicada"
    assert all(f[1] in ids_t for f in filas_ventas + filas_dep), "venta o depósito de tienda inexistente"
    assert all(f[2] in ids_p and f[1] in ids_t for f in filas_vp), "producto o tienda inexistente"
    assert all(c >= 0 for c in gastos.values()) and all(c >= 0 for c in deposito.values()), "monto negativo"
    suma_vp: dict[tuple[str, str], int] = defaultdict(int)
    costo_total = 0
    for mes, tid, _pid, _u, v, c in filas_vp:
        suma_vp[(tid, mes)] += int(v.replace(".", ""))
        costo_total += int(c.replace(".", ""))
    assert suma_vp == dict(venta_mes), "el desglose por producto NO cuadra con la venta POS"

    venta_total = sum(venta_dia.values())
    gasto_total = sum(gastos.values())
    renta_total = sum(c for (m, t, cat), c in gastos.items() if cat == "renta")
    maduras = [c for (tid, dv), c in venta_dia.items() if (dv - info[tid]["apertura"]).days > 730]
    print("Dataset generado en", salida)
    for nombre, filas in [("tiendas", filas_tiendas), ("productos", PRODUCTOS), ("ventas_pos", filas_ventas),
                          ("depositos", filas_dep), ("gastos", gastos), ("ventas_producto", filas_vp)]:
        print(f"  {nombre:<16} {len(filas):>7,} filas")
    print("Calibración contra cifras reales de 3B:")
    print(f"  Venta diaria promedio tienda madura   Ps {sum(maduras) / len(maduras) / 100:>9,.0f}   (real 3T26 promedio red: ~Ps {REAL_VENTA_TIENDA_DIA:,})")
    print(f"  Margen bruto                            {(venta_total - costo_total) / venta_total:>9.1%}   (real 3T26: {REAL_MARGEN_BRUTO:.1%})")
    print(f"  Renta / venta                           {renta_total / venta_total:>9.1%}   (real 3T26: {REAL_RENTA_PCT:.1%})")
    print(f"  Gastos de tienda sin renta / venta      {(gasto_total - renta_total) / venta_total:>9.1%}   (real 3T26 gastos de venta: {REAL_GASTOS_VENTA_PCT:.1%})")
    mp = sum(int(f[4].replace(".", "")) for f in filas_vp if PRODUCTOS[int(f[2][1:]) - 1][3] == 1)
    print(f"  Marca propia / venta                    {mp / venta_total:>9.1%}   (real 2025: {REAL_MARCA_PROPIA:.1%})")
    print("Revisión de calidad: llaves únicas, llaves foráneas, sin negativos y desglose = venta POS  ✔")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Genera el dataset de práctica de Pulso Financiero 3B")
    ap.add_argument("--tiendas", type=int, default=30)
    ap.add_argument("--inicio", default="2026-05-01")
    ap.add_argument("--fin", default="2026-10-31")
    ap.add_argument("--semilla", type=int, default=3, help="misma semilla = mismos datos para todo el equipo")
    ap.add_argument("--salida", default=str(Path(__file__).parent / "csv"))
    a = ap.parse_args()
    generar(a.tiendas, date.fromisoformat(a.inicio), date.fromisoformat(a.fin), a.semilla, Path(a.salida))

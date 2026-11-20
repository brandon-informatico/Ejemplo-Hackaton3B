"""Funciones de conciliación para Pulso Financiero 3B."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import pandas as pd


def _pesos_a_centavos(valor: str) -> int:
    """Convierte un importe en pesos, recibido como texto, a centavos enteros."""
    try:
        importe = Decimal(valor)
        if not importe.is_finite() or importe < 0:
            raise ValueError(f"Importe inválido: {valor}")

        return int(
            (importe * 100).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )
    except (InvalidOperation, TypeError) as error:
        raise ValueError(f"Importe inválido: {valor}") from error


def conciliar_diario(
    ventas: pd.DataFrame,
    depositos: pd.DataFrame,
) -> pd.DataFrame:
    """Recibe ventas y depósitos en pesos como texto y devuelve centavos por día."""
    ventas_trabajo = ventas.copy()
    depositos_trabajo = depositos.copy()

    ventas_trabajo["venta_centavos"] = ventas_trabajo["venta"].map(
        _pesos_a_centavos
    )
    depositos_trabajo["depositado_centavos"] = depositos_trabajo["monto"].map(
        _pesos_a_centavos
    )

    depositos_trabajo["depositado_centavos"] = (
    depositos_trabajo["depositado_centavos"].astype("Int64")
)

    # Relaciona la venta con el depósito usando tienda y fecha de venta.
    resultado = ventas_trabajo.merge(
        depositos_trabajo[
            [
                "tienda_id",
                "fecha_venta",
                "fecha_deposito",
                "depositado_centavos",
            ]
        ],
        how="left",
        left_on=["tienda_id", "fecha"],
        right_on=["tienda_id", "fecha_venta"],
        validate="one_to_one",
        indicator=True,
    )

    # Conserva la señal de que no existe un depósito asociado.
    resultado["deposito_registrado"] = resultado["_merge"].eq("both")

    # En el ejercicio, un depósito no registrado se calcula como cero.
    resultado["depositado_centavos"] = (
        resultado["depositado_centavos"].fillna(0).astype("int64")
    )

    resultado["diferencia_centavos"] = (
        resultado["venta_centavos"] - resultado["depositado_centavos"]
    )

    return resultado[
        [
            "fecha",
            "tienda_id",
            "fecha_deposito",
            "deposito_registrado",
            "venta_centavos",
            "depositado_centavos",
            "diferencia_centavos",
        ]
    ]


def conciliar_semanal(diario: pd.DataFrame) -> pd.DataFrame:
    """Recibe la conciliación diaria y devuelve totales por tienda y semana."""
    trabajo = diario.copy()

    fechas = pd.to_datetime(trabajo["fecha"], format="%Y-%m-%d")
    lunes = fechas - pd.to_timedelta(fechas.dt.weekday, unit="D")
    trabajo["semana"] = lunes.dt.strftime("%Y-%m-%d")

    return (
        trabajo.groupby(["tienda_id", "semana"], as_index=False)[
            [
                "venta_centavos",
                "depositado_centavos",
                "diferencia_centavos",
            ]
        ]
        .sum()
    )

def calcular_indicadores_mensuales(
    ventas: pd.DataFrame,
    gastos: pd.DataFrame,
    ventas_producto: pd.DataFrame,
) -> pd.DataFrame:
    """Calcula ventas, costos, gastos y utilidad por tienda y mes.

    Los importes de entrada se reciben en pesos como texto.
    Los importes de salida se expresan en centavos enteros.
    """
    ventas_trabajo = ventas.copy()
    gastos_trabajo = gastos.copy()
    productos_trabajo = ventas_producto.copy()

    # Obtiene el mes de cada venta diaria.
    ventas_trabajo["mes"] = pd.to_datetime(
        ventas_trabajo["fecha"],
        format="%Y-%m-%d",
        errors="raise",
    ).dt.strftime("%Y-%m")

    # Convierte los importes a centavos antes de sumar.
    ventas_trabajo["venta_centavos"] = ventas_trabajo["venta"].map(
        _pesos_a_centavos
    )
    gastos_trabajo["gasto_centavos"] = gastos_trabajo["monto"].map(
        _pesos_a_centavos
    )
    productos_trabajo["costo_centavos"] = productos_trabajo["costo"].map(
        _pesos_a_centavos
    )

    # Agrupa cada fuente por separado para no duplicar importes.
    venta_mensual = (
        ventas_trabajo.groupby(["tienda_id", "mes"], as_index=False)[
            "venta_centavos"
        ]
        .sum()
    )

    gasto_mensual = (
        gastos_trabajo.groupby(["tienda_id", "mes"], as_index=False)[
            "gasto_centavos"
        ]
        .sum()
        .rename(columns={"gasto_centavos": "gastos_operativos_centavos"})
    )

    costo_mensual = (
        productos_trabajo.groupby(["tienda_id", "mes"], as_index=False)[
            "costo_centavos"
        ]
        .sum()
        .rename(columns={"costo_centavos": "costo_ventas_centavos"})
    )
    

    gasto_mensual["gastos_operativos_centavos"] = (
        gasto_mensual["gastos_operativos_centavos"].astype("Int64")
    )

    costo_mensual["costo_ventas_centavos"] = (
        costo_mensual["costo_ventas_centavos"].astype("Int64")
    )

    # Une los totales mensuales por tienda.
    resultado = venta_mensual.merge(
        gasto_mensual,
        on=["tienda_id", "mes"],
        how="left",
        validate="one_to_one",
    ).merge(
        costo_mensual,
        on=["tienda_id", "mes"],
        how="left",
        validate="one_to_one",
    )

    # No inventa cero cuando faltan gastos o costos.
    columnas_necesarias = [
        "gastos_operativos_centavos",
        "costo_ventas_centavos",
    ]
    if resultado[columnas_necesarias].isna().any().any():
        raise ValueError(
            "Faltan gastos o costos para alguna tienda y mes. "
            "Revisa los datos antes de calcular."
        )

    resultado[columnas_necesarias] = resultado[columnas_necesarias].astype(
        "int64"
    )

    resultado["utilidad_bruta_centavos"] = (
        resultado["venta_centavos"] - resultado["costo_ventas_centavos"]
    )

    resultado["utilidad_operativa_centavos"] = (
        resultado["utilidad_bruta_centavos"]
        - resultado["gastos_operativos_centavos"]
    )

    return resultado

def calcular_margen_operativo(indicadores: pd.DataFrame) -> pd.DataFrame:
    """Agrega el margen operativo porcentual a los indicadores recibidos."""
    resultado = indicadores.copy()

    def porcentaje(fila: pd.Series) -> Decimal | None:
        venta = int(fila["venta_centavos"])
        utilidad = int(fila["utilidad_operativa_centavos"])

        # Si la venta es cero, no se puede calcular el margen.
        if venta == 0:
            return None

        return (
            Decimal(utilidad) * Decimal("100") / Decimal(venta)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    resultado["margen_operativo_pct"] = resultado.apply(porcentaje, axis=1)
    return resultado


def agrupar_por_region(
    indicadores: pd.DataFrame,
    tiendas: pd.DataFrame,
) -> pd.DataFrame:
    """Suma indicadores mensuales por región y calcula su margen."""
    columnas_montos = [
        "venta_centavos",
        "costo_ventas_centavos",
        "gastos_operativos_centavos",
        "utilidad_bruta_centavos",
        "utilidad_operativa_centavos",
    ]

    # Asocia cada tienda con la región indicada en el catálogo.
    datos = indicadores.merge(
        tiendas[["tienda_id", "region"]],
        on="tienda_id",
        how="left",
        validate="many_to_one",
    )

    if datos["region"].isna().any():
        raise ValueError("Hay tiendas sin región en el catálogo.")

    resultado = (
        datos.groupby(["region", "mes"], as_index=False)[columnas_montos]
        .sum()
    )

    # Calcula el margen con los totales de la región.
    return calcular_margen_operativo(resultado)
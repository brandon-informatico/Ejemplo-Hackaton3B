-- =====================================================================
-- Pulso Financiero 3B · Esquema de la base de datos D1 (SQLite)
-- =====================================================================
-- Modelo en estrella, normalizado:
--   DIMENSIONES (catálogos): tiendas, productos, categorias_gasto
--   HECHOS (movimientos):    ventas_pos, depositos, gastos, ventas_producto
-- Reglas del contrato de datos (ver CONTEXT.md):
--   * Todos los montos se guardan en CENTAVOS (enteros) para que todo
--     cuadre al centavo. La API los entrega en pesos con 2 decimales.
--   * Fechas diarias en texto 'AAAA-MM-DD'; meses en texto 'AAAA-MM'.
--   * Sin valores nulos; llaves foráneas (FOREIGN KEY) garantizan que no
--     existan ventas de tiendas o productos que no estén en el catálogo.
--   * Las tablas usan WITHOUT ROWID: la llave primaria ordena los datos
--     y no se gastan escrituras extra en índices (importante en plan gratis).
-- =====================================================================

-- ---------- DIMENSIONES ----------

-- Catálogo de tiendas
CREATE TABLE tiendas (
	tienda_id      TEXT PRIMARY KEY,      -- 'T08'
	nombre         TEXT NOT NULL,         -- 'Tienda 08'
	region         TEXT NOT NULL,         -- Centro | Norte | Sur | Occidente | Bajío
	ciudad         TEXT NOT NULL,
	formato        TEXT NOT NULL,         -- Compacta | Estándar | Plus
	fecha_apertura TEXT NOT NULL,         -- 'AAAA-MM-DD'
	m2             INTEGER NOT NULL CHECK (m2 > 0)
) WITHOUT ROWID;

-- Catálogo de productos
CREATE TABLE productos (
	producto_id           TEXT PRIMARY KEY, -- 'P001'
	nombre                TEXT NOT NULL,
	categoria             TEXT NOT NULL,    -- Abarrotes | Lácteos | Bebidas | ...
	marca_propia          INTEGER NOT NULL CHECK (marca_propia IN (0, 1)),
	precio_lista_centavos INTEGER NOT NULL CHECK (precio_lista_centavos > 0),
	costo_centavos        INTEGER NOT NULL CHECK (costo_centavos > 0)
) WITHOUT ROWID;

-- Catálogo de categorías de gasto (fijo: no depende de la venta; variable: sí)
CREATE TABLE categorias_gasto (
	categoria TEXT PRIMARY KEY,           -- renta | luz | nomina | mantenimiento | merma
	nombre    TEXT NOT NULL,
	tipo      TEXT NOT NULL CHECK (tipo IN ('fijo', 'variable'))
) WITHOUT ROWID;

INSERT INTO categorias_gasto (categoria, nombre, tipo) VALUES
	('renta', 'Renta del local', 'fijo'),
	('luz', 'Energía eléctrica', 'variable'),
	('nomina', 'Nómina del personal de tienda', 'fijo'),
	('mantenimiento', 'Mantenimiento y reparaciones', 'variable'),
	('merma', 'Merma (producto dañado, caducado o faltante)', 'variable');

-- ---------- HECHOS ----------

-- Venta diaria registrada en caja (POS) por tienda
CREATE TABLE ventas_pos (
	fecha          TEXT NOT NULL,         -- 'AAAA-MM-DD'
	tienda_id      TEXT NOT NULL REFERENCES tiendas (tienda_id),
	venta_centavos INTEGER NOT NULL CHECK (venta_centavos >= 0),
	tickets        INTEGER NOT NULL CHECK (tickets >= 0), -- número de compras del día
	PRIMARY KEY (fecha, tienda_id)
) WITHOUT ROWID;

-- Depósito bancario confirmado de la venta de cada día.
-- Si falta la fila, el banco no confirmó depósito de ese día.
CREATE TABLE depositos (
	fecha_venta    TEXT NOT NULL,         -- día de la venta que se deposita
	tienda_id      TEXT NOT NULL REFERENCES tiendas (tienda_id),
	fecha_deposito TEXT NOT NULL,         -- día en que el banco lo confirmó
	monto_centavos INTEGER NOT NULL CHECK (monto_centavos >= 0),
	referencia     TEXT NOT NULL,
	PRIMARY KEY (fecha_venta, tienda_id)
) WITHOUT ROWID;

-- Gasto mensual por categoría
CREATE TABLE gastos (
	mes            TEXT NOT NULL,         -- 'AAAA-MM'
	tienda_id      TEXT NOT NULL REFERENCES tiendas (tienda_id),
	categoria      TEXT NOT NULL REFERENCES categorias_gasto (categoria),
	monto_centavos INTEGER NOT NULL CHECK (monto_centavos >= 0),
	PRIMARY KEY (mes, tienda_id, categoria)
) WITHOUT ROWID;

-- Venta mensual por producto y tienda. Es el desglose de ventas_pos:
-- SUM(venta_centavos) por tienda y mes = SUM(ventas_pos.venta_centavos) de ese mes.
CREATE TABLE ventas_producto (
	mes            TEXT NOT NULL,         -- 'AAAA-MM'
	tienda_id      TEXT NOT NULL REFERENCES tiendas (tienda_id),
	producto_id    TEXT NOT NULL REFERENCES productos (producto_id),
	unidades       INTEGER NOT NULL CHECK (unidades >= 0),
	venta_centavos INTEGER NOT NULL CHECK (venta_centavos >= 0),
	costo_centavos INTEGER NOT NULL CHECK (costo_centavos >= 0), -- costo total de lo vendido
	PRIMARY KEY (mes, tienda_id, producto_id)
) WITHOUT ROWID;

-- Bitácora de cargas de datos (auditoría: quién cargó qué y cuándo)
CREATE TABLE bitacora_cargas (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	fecha_hora TEXT NOT NULL DEFAULT (datetime('now')),
	tabla      TEXT NOT NULL,
	modo       TEXT NOT NULL,             -- reemplazar | agregar
	filas      INTEGER NOT NULL,
	origen     TEXT
);

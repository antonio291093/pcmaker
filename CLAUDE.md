# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PCMaker ERP — sistema de gestión para tienda de cómputo (pcmaker.mx) con dos subdominios:
- `erp.pcmaker.mx` — ERP interno (administración, técnicos, ventas)
- `catalogo.pcmaker.mx` — catálogo público de productos

## Monorepo Structure

```
pcmaker/
├── backend/          # API REST Node.js/Express
├── frontend/         # ERP Next.js (exported as static SPA)
├── catalogo/         # Catálogo público Next.js (SSR)
├── frontend-static/  # Salida del build de frontend, servida por nginx
├── nginx/            # Configuración del reverse proxy
└── docker-compose.yml
```

## Commands

### Development

```bash
# Backend
cd backend && npm install
node src/server.js           # producción
npx nodemon src/server.js    # dev con hot-reload

# Frontend ERP
cd frontend && npm install
npm run dev                  # http://localhost:3000

# Catálogo
cd catalogo && npm install
npm run dev                  # http://localhost:3001 (en docker expuesto en 3001)
```

### Build & Production

```bash
# Build del frontend (genera /frontend/out → copiar a /frontend-static)
cd frontend && npm run build

# Lint
cd frontend && npm run lint
cd catalogo && npm run lint

# Levantar todo en producción
docker compose up -d
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 18, Express 5, PostgreSQL (pg), JWT (httpOnly cookies), bcryptjs, multer, pdf-lib, sharp, bwip-js |
| Frontend ERP | Next.js 15 (`output: 'export'`), React 19, TypeScript, Tailwind CSS 4, Framer Motion, SweetAlert2, @react-pdf/renderer, xlsx |
| Catálogo | Next.js 16 (SSR), React 19, TypeScript, Tailwind CSS 4 |
| Infra | Docker Compose, Nginx (reverse proxy + SSL), Certbot (Let's Encrypt) |

## Architecture

### Frontend ERP — Static SPA

El frontend se compila como **static export** (`output: 'export'` en `next.config.ts`). Nginx sirve los archivos estáticos desde `frontend-static/`. No hay servidor Next.js en producción para el ERP.

Las llamadas al API usan la variable de entorno `NEXT_PUBLIC_API_URL` (inyectada en build time). El middleware Next.js (`frontend/middleware.ts`) se ejecuta en build-time/edge y redirige según rol. En producción, la protección real viene del backend (JWT en cookie httpOnly).

### Auth Flow

1. Login → backend setea cookie httpOnly con JWT
2. Next.js middleware (`middleware.ts`) llama `GET /api/usuarios/me` en cada request protegido
3. `UserContext` carga el usuario en cliente; admins pueden cambiar `sucursal_activa` (localStorage)
4. `corteCajaMiddleware` bloquea ventas (rol 3) si hay corte de caja pendiente (HTTP 423)

### Roles

| rol_id | Rol | Ruta frontend |
|--------|-----|---------------|
| 1 | Admin | `/admin` |
| 2 | Técnico | `/tecnico` |
| 3 | Ventas | `/ventas` |

### Backend — Estructura detallada

```
backend/src/
├── routes/       → define endpoints, aplica middlewares
├── controllers/  → lógica HTTP (parseo de req, res.json)
├── models/       → SQL puro con pg Pool; una función por operación
│   ├── ventas.js         → registrarVenta (transacción completa)
│   ├── garantias.js      → obtenerDatosGarantia (query unificada)
│   ├── reportes.js       → obtenerReporteVentas, obtenerDetalleDiario
│   ├── inventario.js     → descontarStockVenta (acepta client externo)
│   ├── caja.js           → registrarMovimiento (acepta client externo)
│   ├── comisiones.js     → crearComision (acepta client externo)
│   └── equipos.js        → obtenerConteosPorEstado
├── utils/
│   ├── sqlFragments.js   → CASE_DESCRIPCION_VENTA, CASE_ESPECIFICACIONES_VENTA
│   └── pdf/              → generadores PDF con pdf-lib
└── config/
    └── db.js             → pool de PostgreSQL (único, compartido por todos los modelos)
```

Las operaciones multi-tabla usan transacciones explícitas:
```js
const client = await pool.connect()
try {
  await client.query('BEGIN')
  // ...operaciones...
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  throw e
} finally {
  client.release()
}
```

El `pool` en `app.js` y `config/db.js` son instancias distintas. Los modelos siempre importan `config/db.js`; nunca crear un `new Pool()` adicional.

#### Patrón `client = pool` para transacciones compartidas

Las funciones de modelo que participan en transacciones externas aceptan un `client` opcional:

```js
async function descontarStockVenta({ producto_id, cantidad, sucursal_id }, client = pool) {
  await client.query(...)
}
```

Llamadas sin argumento usan el pool directamente. Llamadas dentro de una transacción reciben el `client` activo.

#### SQL compartido — `backend/src/utils/sqlFragments.js`

Los fragmentos `CASE WHEN` reutilizados en múltiples queries (descripción e especificaciones de ítems de venta) están centralizados aquí:

```js
const { CASE_DESCRIPCION_VENTA, CASE_ESPECIFICACIONES_VENTA } = require('../utils/sqlFragments')
// uso: `SELECT ${CASE_DESCRIPCION_VENTA} AS descripcion ...`
```

Usados en `models/reportes.js` (2 queries) y `models/ventas.js` (ticket).

### Frontend ERP — Estructura de utilidades y hooks

```
frontend/src/
├── utils/
│   ├── api.ts              → exporta API_URL (NEXT_PUBLIC_API_URL)
│   ├── fecha.ts            → exporta toDateString(date?) → "YYYY-MM-DD"
│   ├── exportVentasExcel.ts
│   └── exportCaptura.ts
├── context/
│   └── UserContext.tsx     → useUser() — { id, rol_id, sucursal_id, nombre }
└── app/
    ├── components/
    │   ├── Types.ts                    → interfaces compartidas (ConfiguracionPago, IdNombre, ...)
    │   ├── SeleccionarProductoModal.tsx → exporta Producto, ProductoSeleccionado
    │   └── ModalSeleccionarServicios.tsx → exporta ServicioPendiente
    └── ventas/
        ├── hooks/
        │   └── useVenta.ts → todo el estado, efectos, memos y handlers del form de venta
        └── components/
            ├── SalesForm.tsx       → esqueleto del form (JSX + wiring, ~115 líneas)
            ├── ListaItems.tsx      → listas de productos y servicios + bloque de totales
            └── PanelPagos.tsx      → grid de pagos (3 métodos) + tarjeta de transferencia
```

### Nginx Routing

- `erp.pcmaker.mx` → archivos estáticos en `frontend-static/`, `/api/*` → `backend_app:5000`
- `catalogo.pcmaker.mx` → `catalogo_app:3000` (SSR), `/api/*` → `backend_app:5000`
- `/catalogo-img/` → archivos en `backend/uploads/catalogo/`

## Environment Variables

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=...
CORS_ORIGIN=https://erp.pcmaker.mx
PORT=5000

# Frontend (build arg)
NEXT_PUBLIC_API_URL=https://erp.pcmaker.mx

# Frontend middleware (server-side)
API_URL=http://backend_app:5000
```

## Base de datos

El esquema completo con todas las tablas, columnas, PKs, FKs, CHECK constraints e índices está en **`database/schema.sql`**. Leerlo antes de crear cualquier endpoint o tabla nueva.

### Tablas principales y relaciones clave

| Tabla | Relaciones importantes |
|-------|----------------------|
| `usuarios` | `rol_id → roles`, `sucursal_id → sucursales` |
| `equipos` | `lote_etiqueta_id → lotes_etiquetas`, `estado_id → catalogo_estados`, `sucursal_id`, `tecnico_id → usuarios` |
| `inventario` | `equipo_id → equipos` (NULL si no es equipo), `sucursal_id`, soft-delete con `eliminado` |
| `inventario_especificaciones` | `inventario_id → inventario` (1:1, para recepción directa) |
| `equipos_ram` / `equipos_almacenamiento` | PK compuesta `(equipo_id, componente_id)` |
| `ventas` | `user_venta → usuarios`, `sucursal_id` |
| `venta_detalle` | `venta_id → ventas`, `producto_id → inventario` (NULL si servicio), `mantenimiento_id → mantenimientos` |
| `ventas_pagos` | `venta_id → ventas`, `metodo_pago ∈ {efectivo, transferencia, terminal, facturacion}` |
| `caja_dias` | UNIQUE `(sucursal_id, fecha)` |
| `comisiones` | FK nullable a `ventas`, `mantenimientos` o `equipos` — el tipo se infiere por cuál no es NULL |
| `pedidos` / `pedido_equipos` | Traslado de equipos entre sucursales |

### Patrones clave en inventario

- **`origen`**: `'tecnico'` = equipo armado por técnico, `'recepcion_directa'` = equipo recibido directamente
- **Soft-delete**: `eliminado = TRUE` + `motivo_eliminacion` + `eliminado_por`; las queries siempre filtran `eliminado = FALSE`
- **SKU autogenerado**: formato `YYYYMMDDHHmmss###`, con imagen de barcode en base64 generado por bwip-js
- **`visible_catalogo`**: controla si el ítem aparece en `catalogo.pcmaker.mx`
- Equipos armados se identifican por `estado_id = 4` en la tabla `equipos`

## Key Conventions

- **Backend**: CommonJS (`require`/`module.exports`), sin TypeScript, sin ORM
- **Frontend**: TypeScript, App Router de Next.js, sin `use server`, todo client-side fetch a `/api`
- **Estilos**: Tailwind CSS 4 (sin config file, via PostCSS), sin CSS Modules excepto `page.module.css` en raíz
- **PDF**: `@react-pdf/renderer` en frontend para etiquetas/recibos; `pdf-lib` en backend para reportes
- **Imágenes de catálogo**: subidas con multer a `backend/uploads/catalogo/`, servidas por nginx en `/catalogo-img/`
- La `sucursal_activa` del admin se persiste en `localStorage` y se pasa explícitamente en cada request; los usuarios de ventas/técnico usan su `sucursal_id` del JWT

## Reglas establecidas — no romper

### Frontend

| Regla | Detalle |
|-------|---------|
| `API_URL` | Siempre desde `import { API_URL } from '@/utils/api'` — nunca hardcodear la URL |
| Fechas YYYY-MM-DD | Siempre `toDateString(date?)` desde `@/utils/fecha` — nunca `getFullYear/getMonth/getDate` inline ni `toISOString().split('T')[0]` |
| Errores del backend | Leer siempre `error.message` — el backend responde `{ message: '...' }` en todos los endpoints |
| IVA sobre servicios | **Nunca.** El IVA (16%) aplica solo sobre productos. `subtotalServicios` no entra en la base del IVA |
| Tipos TypeScript | No usar `any`. Los tipos compartidos entre componentes van en `frontend/src/app/components/Types.ts` |

### Backend

| Regla | Detalle |
|-------|---------|
| Respuestas de error | Siempre `res.status(4xx/5xx).json({ message: '...' })` — nunca `{ error: }` |
| Pool de BD | Siempre importar desde `config/db.js` — nunca instanciar `new Pool()` en otro archivo |
| SQL compartido | CASE WHEN reutilizables van en `backend/src/utils/sqlFragments.js`, no duplicados en cada modelo |
| Flujo de venta | Stock, movimiento de caja y comisión se registran **dentro de la misma transacción** que la venta (`registrarVenta` en `models/ventas.js`) — nunca como llamadas HTTP separadas desde el frontend |
| SQL en controladores | Los controladores no deben tener `pool.query` directos — la lógica SQL va en el modelo correspondiente |
| Rutas estáticas vs parametrizadas | En Express, las rutas estáticas (`/conteos`) deben declararse **antes** que las parametrizadas (`/:id`) en el mismo router |

## Archivos clave por módulo

Leer `database/schema.sql` antes de crear cualquier endpoint o tabla nueva.

### Ventas

| Archivo | Qué contiene |
|---------|-------------|
| `backend/src/models/ventas.js` | `registrarVenta` — transacción completa: venta, detalle, pagos, stock, caja, comisión |
| `backend/src/controllers/controladorVentas.js` | Llama a `obtenerDatosTicket` de models/ventas.js |
| `frontend/src/app/ventas/hooks/useVenta.ts` | Todo el estado, efectos, memos y `handleSubmit` |
| `frontend/src/app/ventas/components/SalesForm.tsx` | Esqueleto del form — solo JSX + wiring hacia el hook |
| `frontend/src/app/ventas/components/ListaItems.tsx` | Listas de productos/servicios seleccionados + totales |
| `frontend/src/app/ventas/components/PanelPagos.tsx` | Grid de 3 métodos de pago + tarjeta de transferencia |

### Reportes

| Archivo | Qué contiene |
|---------|-------------|
| `backend/src/utils/sqlFragments.js` | `CASE_DESCRIPCION_VENTA`, `CASE_ESPECIFICACIONES_VENTA` |
| `backend/src/models/reportes.js` | `obtenerReporteVentas`, `obtenerDetalleDiario` — usan los fragmentos SQL |
| `backend/src/controllers/controladorReportes.js` | Endpoints de reportes y resúmenes por sucursal |

### Garantías y tickets

| Archivo | Qué contiene |
|---------|-------------|
| `backend/src/models/garantias.js` | `obtenerDatosGarantia` — query unificada (equipos armados + recepción directa + inventario genérico en un solo JOIN) |
| `backend/src/models/ventas.js` | `obtenerDatosTicket` — cabecera de venta + ítems con descripción y especificaciones |
| `backend/src/utils/pdf/generarGarantia.js` | Genera el PDF de garantía con pdf-lib |

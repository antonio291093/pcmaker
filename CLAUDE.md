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

### Backend MVC

```
routes/     → define endpoints, aplica middlewares
controllers/ → lógica HTTP (parseo de req, respuesta)
models/     → SQL puro con parameterized queries (pg Pool)
```

Las operaciones multi-tabla usan transacciones explícitas:
```js
const client = await pool.connect()
await client.query('BEGIN') / client.query('COMMIT') / client.query('ROLLBACK')
client.release()
```

El `pool` en `app.js` y `config/db.js` son instancias distintas. Los modelos importan `config/db.js`; `app.js` crea su propio pool solo para test de conexión al iniciar.

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

## Database Schema (tablas principales)

```sql
usuarios          (id, nombre, email, contraseña, rol_id, activo, sucursal_id)
sucursales        (id, nombre, ...)

-- Flujo de recepción de equipos
lotes             (id, etiqueta, fecha_recibo, total_equipos, usuario_recibio)
lotes_etiquetas   (id, lote_id, etiqueta, serie, barcode)
equipos           (id, nombre, descripcion, tipo, procesador, lote_etiqueta_id, estado_id, sucursal_id, tecnico_id)
equipos_ram       (equipo_id, memoria_ram_id, cantidad)
equipos_almacenamiento (equipo_id, almacenamiento_id, rol)

-- Catálogos
catalogo_estados         (id, nombre, visual_color)
catalogo_memoria_ram     (id, descripcion, tipo_modulo)
catalogo_almacenamiento  (id, descripcion)
catalogo_mantenimiento   (id, descripcion, costo)
catalogo_categorias      (id, descripcion)

-- Inventario
inventario        (id, equipo_id, tipo, especificacion, cantidad, disponibilidad, estado,
                   precio, memoria_ram_id, almacenamiento_id, sucursal_id, fecha_creacion,
                   sku, barcode, es_codigo_generado, origen, eliminado, motivo_eliminacion,
                   fecha_eliminacion, eliminado_por, categoria_catalogo_id, visible_catalogo)
inventario_especificaciones (inventario_id, modelo, procesador, ram_gb, ram_tipo,
                             almacenamiento_gb, almacenamiento_tipo, observaciones)

-- Ventas
ventas            (id, cliente, telefono, correo, observaciones, user_venta, sucursal_id,
                   subtotal, iva, total, requiere_factura, fecha_venta)
venta_detalle     (venta_id, tipo[producto|servicio], producto_id, mantenimiento_id, equipo_id,
                   cantidad, precio_unitario, subtotal)
ventas_pagos      (venta_id, metodo_pago[efectivo|transferencia|terminal|facturacion], monto)

-- Caja
caja_movimientos  (id, tipo[venta|gasto|ingreso], monto, descripcion, sucursal_id, usuario_id, fecha)
caja_dias         (sucursal_id, fecha, estado[abierto|cerrado], usuario_id) UNIQUE(sucursal_id, fecha)
caja_cortes       (fecha, sucursal_id, usuario_id, total_ventas, total_ingresos, total_gastos,
                   balance_final, total_efectivo, total_transferencia, total_terminal, total_facturacion)

mantenimientos    (id, fecha_mantenimiento, detalle, tecnico_id, sucursal_id, catalogo_id,
                   costo_personalizado, estado[pendiente|cobrado])
```

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

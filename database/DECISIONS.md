# Decisiones de arquitectura — PCMaker ERP

Registro de decisiones no obvias tomadas durante el desarrollo y la refactorización.
El "por qué" es lo que importa: el código muestra el qué, este archivo muestra el razonamiento.

---

## 1. `sqlFragments.js` en lugar de vistas SQL

**Decisión:** Los fragmentos `CASE WHEN` reutilizados (descripción e especificaciones de ítems de venta) viven como constantes de string en `backend/src/utils/sqlFragments.js`, interpoladas en queries con template literals.

**Por qué no vistas SQL:**
- Las vistas encapsulan una query completa. Estos fragmentos son porciones de un `SELECT` que se combinan con `JOIN`s y `WHERE`s distintos en cada query que los usa — no hay una sola query que valga la pena vistear.
- Crear vistas requeriría una migración coordinada en la base de datos. Las constantes JS son versionadas junto al código que las usa y no añaden estado a la BD.
- El proyecto no tiene framework de migraciones. Introducir una vista SQL sin gestión de migraciones crea deuda operativa (¿quién la crea en producción? ¿cómo se sincroniza con el repo?).

**Trade-off aceptado:** Si la BD cambia de schema, hay que actualizar tanto el fragmento JS como las queries que lo usan. Con una vista SQL solo se actualizaría la vista. Este costo se considera menor dado que los cambios de schema son infrecuentes y controlados.

---

## 2. El IVA nunca aplica sobre servicios

**Decisión:** El cálculo `iva = requiere_factura ? subtotalProductos * 0.16 : 0` usa exclusivamente `subtotalProductos`, excluyendo `subtotalServicios`.

**Por qué:**
- Los servicios de mantenimiento registrados en este sistema son cobros por mano de obra técnica que ya fueron acordados con el cliente cuando se creó el mantenimiento (`catalogo_mantenimiento.costo` o `costo_personalizado`). No son una nueva venta gravable en el momento del cobro.
- Los servicios llegan a la venta desde `mantenimientos` con estado `'pendiente'` y se marcan `'cobrado'`. Son un cobro de servicio previo, no una venta de producto físico.
- En el contexto fiscal mexicano del negocio (pcmaker.mx), la separación producto/servicio tiene implicaciones en la facturación. Gravar los servicios con IVA en este punto duplicaría o incorrectamente incrementaría la base gravable.

**Implementación:** `useVenta.ts` separa `subtotalProductos` y `subtotalServicios` en dos `useMemo` distintos. Solo `subtotalProductos` alimenta el IVA. El `subtotal` que se envía al backend sigue siendo la suma total (productos + servicios, sin IVA).

---

## 3. La comisión se calcula en el backend, dentro de la transacción

**Decisión:** `crearComision` se llama desde dentro de `registrarVenta` en `models/ventas.js`, no como un `POST /api/comisiones` separado desde el frontend.

**Por qué:**
- Antes de la refactorización, el frontend hacía 3 llamadas HTTP independientes después de registrar la venta: descontar stock, registrar movimiento de caja, y crear comisión. Si cualquiera fallaba (error de red, timeout, reinicio del servidor), la venta quedaba registrada pero sin uno o más efectos secundarios — inconsistencia silenciosa sin posibilidad de rollback.
- La tasa de comisión (`configuraciones WHERE nombre = 'comision_ventas'`) es configuración del negocio que vive en la BD. El frontend no debe leerla para calcular — ese cálculo pertenece al servidor.
- Al estar dentro de la misma transacción `BEGIN/COMMIT`, si cualquier paso falla (stock insuficiente, error de caja, error de comisión) se hace `ROLLBACK` de todo. La venta nunca existe sin sus efectos secundarios.

**Default asumido:** Si `configuraciones` no tiene la clave `comision_ventas`, la tasa cae a `0.03` (3%). Esto es intencional: preferible pagar comisión a no pagarla por un dato faltante en configuración.

---

## 4. `client = pool` como parámetro opcional en modelos

**Decisión:** Las funciones que pueden participar en una transacción externa aceptan `client = pool` como segundo parámetro:
```js
async function descontarStockVenta(params, client = pool) { ... }
```

**Alternativas descartadas:**

| Alternativa | Problema |
|-------------|----------|
| Siempre requerir `client` | Rompe todos los callers existentes y fuerza a crear un client incluso en operaciones independientes |
| Funciones duplicadas (`X` y `XConClient`) | Duplicación de código; los dos pueden divergir |
| Pasar la transacción como contexto global | Antipatrón en Node.js async — el contexto se mezcla entre requests concurrentes |

**Por qué este patrón funciona:** `pool.query(sql, params)` y `client.query(sql, params)` tienen la misma firma. Llamar sin argumento usa el pool (autocommit implícito). Llamar con el `client` activo participa en la transacción abierta. Sin cambios en la lógica interna de la función.

---

## 5. Soft-delete en inventario, nunca DELETE físico

**Decisión:** Los ítems de inventario nunca se borran de la tabla. Se marcan con `eliminado = TRUE`, `motivo_eliminacion`, `fecha_eliminacion` y `eliminado_por`.

**Por qué:**
- `venta_detalle.producto_id → inventario.id`. Si se borrara físicamente un ítem vendido, las ventas históricas perderían la referencia al producto — los tickets y reportes quedarían incompletos.
- Los cortes de caja y reportes de ventas históricas necesitan poder reconstruir qué se vendió, a qué precio y qué era. Un DELETE físico hace imposible esa reconstrucción.
- El soft-delete permite auditoría: se sabe quién eliminó qué y por qué. Útil para detectar errores operativos o fraude.

**Consecuencia operativa:** Todas las queries sobre inventario deben incluir `WHERE eliminado = FALSE`. Olvidarlo muestra ítems fantasma en el UI.

---

## 6. `string_agg` en lugar de `json_agg` para RAM y almacenamiento en garantías

**Decisión:** La query unificada en `models/garantias.js` usa `string_agg(descripcion, ', ')` para las memorias RAM y almacenamientos de equipos armados, no `json_agg`.

**Por qué:**
- La query anterior usaba `json_agg` (que retorna un array JSON), mientras que las otras dos ramas de la query (recepción directa e inventario genérico) retornaban strings directamente con `CONCAT`.
- El controlador tenía que distinguir con `Array.isArray(e.memorias_ram)` para manejar ambos tipos en el mismo campo — lógica de normalización que pertenece a la capa de datos, no al controlador.
- Al unificar en `string_agg`, los tres orígenes retornan el mismo tipo (`text`). El controlador simplemente hace `e.ram || ''` sin bifurcaciones.

---

## 7. El `pool` de `app.js` y el de `config/db.js` son instancias separadas

**Decisión (heredada, no cambiada):** `app.js` crea su propio `new Pool()` solo para verificar la conexión al arrancar. Los modelos usan el singleton de `config/db.js`.

**Por qué no se unificó:**
- El pool de `app.js` se usa exactamente una vez (test de conectividad al inicio) y no participa en ninguna query real. Unificarlo requeriría importar `config/db.js` en `app.js` cambiando el orden de inicialización, con riesgo de efectos en el arranque del servidor.
- El costo de tener dos conexiones de pool activas momentáneamente al inicio es negligible.

**Riesgo:** Si se añaden queries en `app.js` usando su pool local en lugar del de `config/db.js`, esas queries no participarían en las mismas transacciones. No hacer esto.

---

## 8. Las rutas estáticas se declaran antes que las parametrizadas en Express

**Decisión:** En cualquier router, `GET /conteos` debe ir antes de `GET /:id`.

**Por qué es necesario y no obvio:**
- Express evalúa rutas en orden de declaración. `/conteos` sin esta regla matchea como `/:id` con `id = "conteos"`, y el controlador intenta buscar un equipo con ese ID — falla con error o retorna vacío.
- Esto afecta a cualquier ruta estática en un router que también tenga rutas parametrizadas. No es una convención de estilo, es un requisito funcional de Express.

---

## 9. Los totales del formulario de venta se calculan en el frontend, no se consultan al backend

**Decisión:** `subtotal`, `iva` y `total` se calculan en `useVenta.ts` con `useMemo` y se envían al backend como parte del `POST /api/ventas`. El backend los almacena directamente en la tabla `ventas` sin recalcular.

**Por qué:**
- El formulario necesita mostrar el total en tiempo real mientras el usuario selecciona productos, cambia cantidades y activa/desactiva la factura. Hacer un request al backend por cada cambio sería costoso e innecesario.
- Los precios ya están en el frontend (vienen del modal de selección de productos). El cálculo es determinístico: `sum(precio × cantidad) + IVA condicional`.

**Riesgo aceptado:** Un cliente malicioso podría manipular los valores antes del POST. Para este sistema (ERP interno, acceso autenticado con roles, no e-commerce público), este riesgo se considera aceptable. Si se necesitara mayor seguridad, el backend debería recalcular los totales desde los IDs de productos recibidos.

---

## 10. Permisos de PostgreSQL al crear tablas nuevas

Cuando se crea una tabla nueva directamente en psql o pgAdmin con un usuario distinto al de la app, el usuario de la aplicación (`pcmaker_user`) no hereda permisos automáticamente.

Después de cualquier `CREATE TABLE` ejecutar siempre:

```sql
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE nombre_tabla TO pcmaker_user;
GRANT USAGE, SELECT ON SEQUENCE nombre_tabla_id_seq TO pcmaker_user;
```

Tablas donde ya se aplicó: `clientes` (Mayo 2026)

---

## 13. Sistema de servicio activo/inactivo

**Decisión:** El estado del servicio vive en `configuraciones` (clave: `servicio_activo`). El toggle se controla vía `POST /api/admin/servicio/toggle`, protegido por el header `X-Admin-Token` definido en el `.env` del VPS (no en el repo — solo en `/var/www/pcmaker/.env`).

**Por qué:**
- El middleware de Next.js solo actúa en la carga inicial (dev) — no protege navegación client-side en producción con `output: 'export'`.
- `ServicioGuard` actúa client-side: se ejecuta en cada render del layout y redirige a `/servicio-inactivo` si el servicio está desactivado.
- `trailingSlash: true` en `next.config.ts` hace que `usePathname()` devuelva rutas con `/` al final — siempre normalizar con `pathname.replace(/\/$/, '')` antes de comparar rutas exactas.
- El token de admin para el toggle no se versiona en el repo; vive únicamente en el `.env` del servidor de producción.

---

## 14. Protección de roles client-side con RolGuard

**Decisión:** Cada layout de rol (`/admin`, `/ventas`, `/tecnico`) envuelve su contenido con `<RolGuard rolRequerido={X}>`. Dentro de ese wrapper va `<ServicioGuard>`.

**Por qué:**
- El middleware de Next.js (`middleware.ts`) no protege la navegación client-side en un static export — solo actúa en la carga inicial de la página.
- `RolGuard` usa `useUser()` para verificar el `rol_id` en cada render y redirige a `/login` si no coincide, cerrando el hueco que deja el middleware en navegaciones SPA.
- El orden `RolGuard → ServicioGuard → contenido` es obligatorio: primero se verifica identidad y rol, luego disponibilidad del servicio.

---

## 11. Bug conocido — `actualizarEquipoArmado` sin `sucursal_id`

Las queries de reponer/descontar stock en `actualizarEquipoArmado`
(`inventario.js` líneas ~281, 290, 328, 337) no filtran por
`sucursal_id` y pueden afectar registros de otras sucursales.
Pendiente de corregir en una sesión futura.

```js
// Ejemplo del problema:
UPDATE inventario SET cantidad = cantidad - 1
WHERE memoria_ram_id = $1 AND cantidad > 0
-- Falta: AND sucursal_id = $2
```

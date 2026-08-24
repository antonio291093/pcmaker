/**
 * Crea/resetea los datos de prueba (fixtures) que usan los tests E2E de
 * Garantías y Pedidos — decoupled de datos reales, marcados con "[E2E]".
 *
 * Uso: cd backend && node scripts/seedE2EFixtures.js
 * Se registra como globalSetup de Playwright (ver playwright.config.ts):
 * corre una vez antes de toda la suite y deja los fixtures en un estado
 * conocido sin importar lo que haya dejado la corrida anterior. Al final
 * escribe e2e/.fixtures.json con los IDs reales para que los specs no
 * tengan que adivinarlos ni hardcodearlos.
 *
 * Requiere que backend/scripts/seedE2EUsers.js ya se haya corrido (usa los
 * usuarios E2E Ventas Test / E2E Admin Test).
 *
 * Todas las mutaciones sobre `inventario` siguen el mismo patrón que el
 * resto del backend: pool.connect() -> BEGIN -> setAuditContext -> DML ->
 * COMMIT (ver backend/src/utils/auditContext.js), vía el helper
 * withAuditContext. `ventas` / `venta_detalle` / `garantia_solicitudes` no
 * tienen trigger de auditoría (solo `inventario` lo tiene — confirmado en
 * database/migrations/004_auditoria_inventario.sql), así que esas mutaciones
 * usan una transacción simple.
 */
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");
const { withAuditContext } = require("../src/utils/auditContext");
const { cancelarPedido } = require("../src/models/pedido");

const CONTEXTO = "e2e_seed";
const FIXTURES_OUT = path.resolve(__dirname, "../../e2e/.fixtures.json");

const SKU = {
  vendidoReparacion: "E2E-GARANTIA-VENDIDO-A",
  vendidoReemplazo: "E2E-GARANTIA-VENDIDO-B",
  vendidoRechazo: "E2E-GARANTIA-VENDIDO-C",
  componenteReparacion: "E2E-GARANTIA-COMPONENTE-001",
  productoReemplazo: "E2E-GARANTIA-REEMPLAZO-001",
  equipoPedidoCompletar: "E2E-PEDIDO-EQUIPO-A",
  equipoPedidoCancelar: "E2E-PEDIDO-EQUIPO-B",
};

const STOCK_COMPONENTE_REPARACION = 100;
const STOCK_PRODUCTO_REEMPLAZO = 50;

const VENTA_MARCADOR = "[E2E] fixture:garantia";

async function obtenerUsuarioPorEmail(email) {
  const { rows } = await pool.query(`SELECT id FROM usuarios WHERE email = $1`, [email]);
  if (!rows.length) {
    throw new Error(`Usuario ${email} no existe — corre primero backend/scripts/seedE2EUsers.js`);
  }
  return rows[0].id;
}

async function obtenerSucursales() {
  const { rows } = await pool.query(`SELECT id FROM sucursales ORDER BY id ASC`);
  if (rows.length < 2) {
    throw new Error("Se necesitan al menos 2 sucursales en la base de datos para probar Pedidos.");
  }
  return { origenId: rows[0].id, destinoId: rows[1].id };
}

/**
 * Inserta o actualiza una fila de `inventario` identificándola por SKU
 * (estable entre corridas, no depende de texto ni de sucursal actual).
 * Debe llamarse con un `client` que ya tiene BEGIN + setAuditContext
 * aplicados (ver withAuditContext).
 */
async function upsertInventarioPorSku(client, { sku, especificacion, tipo, cantidad, precio = 0, origen = "tecnico", sucursal_id }) {
  const { rows: existentes } = await client.query(`SELECT id FROM inventario WHERE sku = $1`, [sku]);

  if (existentes.length) {
    const { rows } = await client.query(
      `UPDATE inventario
       SET especificacion = $1, tipo = $2, cantidad = $3, precio = $4, origen = $5, sucursal_id = $6, eliminado = FALSE
       WHERE id = $7
       RETURNING *`,
      [especificacion, tipo, cantidad, precio, origen, sucursal_id, existentes[0].id]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO inventario (tipo, especificacion, cantidad, precio, sucursal_id, origen, sku, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'usado')
     RETURNING *`,
    [tipo, especificacion, cantidad, precio, sucursal_id, origen, sku]
  );
  return rows[0];
}

/**
 * Cancela (vía la lógica real de negocio, no a mano) cualquier pedido no
 * terminal que haya quedado colgado de una corrida anterior referenciando
 * el inventario_id dado — así el traspaso de sucursal se revierte con la
 * misma función que usa la app (moverItem dentro de cancelarPedido).
 */
async function cancelarPedidosColgados(inventarioId, adminId) {
  const { rows: pedidosActivos } = await pool.query(
    `SELECT DISTINCT p.id
     FROM pedido_items pi
     JOIN pedidos p ON p.id = pi.pedido_id
     WHERE pi.inventario_id = $1
       AND p.estado NOT IN ('completado', 'cancelado')`,
    [inventarioId]
  );

  for (const { id } of pedidosActivos) {
    await cancelarPedido(id, {
      cancelado_por: adminId,
      motivo: "Reset automático de fixtures E2E (backend/scripts/seedE2EFixtures.js)",
    });
    console.log(`  ↳ pedido colgado #${id} cancelado (reset de fixture)`);
  }
}

async function resetGarantiaFixtures({ adminId, ventasUserId, sucursalId }) {
  // 1) Inventario de garantías — todo dentro de UNA transacción con contexto de auditoría,
  //    igual que el resto del backend (ver backend/src/utils/auditContext.js).
  const inv = await withAuditContext({ userId: adminId, contexto: CONTEXTO, referenciaId: null }, async (client) => {
    const vendidoReparacion = await upsertInventarioPorSku(client, {
      sku: SKU.vendidoReparacion,
      especificacion: "[E2E] Producto Vendido A",
      tipo: "Otro",
      cantidad: 0, // ya "vendido" — no se usa como stock
      sucursal_id: sucursalId,
    });
    const vendidoReemplazo = await upsertInventarioPorSku(client, {
      sku: SKU.vendidoReemplazo,
      especificacion: "[E2E] Producto Vendido B",
      tipo: "Otro",
      cantidad: 0,
      sucursal_id: sucursalId,
    });
    const vendidoRechazo = await upsertInventarioPorSku(client, {
      sku: SKU.vendidoRechazo,
      especificacion: "[E2E] Producto Vendido C",
      tipo: "Otro",
      cantidad: 0,
      sucursal_id: sucursalId,
    });
    // precio > 0 requerido — ModalSeleccionarProducto bloquea la selección
    // de productos sin precio asignado (ver toggleSeleccion en
    // SeleccionarProductoModal.tsx).
    const componenteReparacion = await upsertInventarioPorSku(client, {
      sku: SKU.componenteReparacion,
      especificacion: "[E2E] Componente Reparación",
      tipo: "Otro",
      cantidad: STOCK_COMPONENTE_REPARACION,
      precio: 500,
      sucursal_id: sucursalId,
    });
    const productoReemplazo = await upsertInventarioPorSku(client, {
      sku: SKU.productoReemplazo,
      especificacion: "[E2E] Producto Reemplazo",
      tipo: "Otro",
      cantidad: STOCK_PRODUCTO_REEMPLAZO,
      precio: 1500,
      sucursal_id: sucursalId,
    });
    return { vendidoReparacion, vendidoReemplazo, vendidoRechazo, componenteReparacion, productoReemplazo };
  });

  // 2) Venta + venta_detalle fixture (sin trigger de auditoría — transacción simple).
  //    Una sola venta con 3 artículos independientes, uno por escenario de test,
  //    para que reparación/reemplazo/rechazo no se bloqueen entre sí por
  //    "ya_reclamado" (ver obtenerVentaElegible en garantiaSolicitud.js).
  const client = await pool.connect();
  let ventaId;
  try {
    await client.query("BEGIN");

    const { rows: ventaExistente } = await client.query(
      `SELECT id FROM ventas WHERE observaciones = $1 LIMIT 1`,
      [VENTA_MARCADOR]
    );

    if (ventaExistente.length) {
      ventaId = ventaExistente[0].id;
      await client.query(
        `UPDATE ventas SET fecha_venta = NOW(), sucursal_id = $1, user_venta = $2 WHERE id = $3`,
        [sucursalId, ventasUserId, ventaId]
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO ventas
           (cliente, telefono, user_venta, sucursal_id, total, subtotal, iva, requiere_factura, observaciones, fecha_venta)
         VALUES ($1, $2, $3, $4, 3000, 2586.21, 413.79, FALSE, $5, NOW())
         RETURNING id`,
        ["[E2E] Cliente Garantías", "5550000000", ventasUserId, sucursalId, VENTA_MARCADOR]
      );
      ventaId = rows[0].id;
    }

    const detalles = {};
    for (const [key, item] of Object.entries({
      itemReparacion: inv.vendidoReparacion,
      itemReemplazo: inv.vendidoReemplazo,
      itemRechazo: inv.vendidoRechazo,
    })) {
      const { rows: detalleExistente } = await client.query(
        `SELECT id FROM venta_detalle WHERE venta_id = $1 AND producto_id = $2 AND tipo = 'producto' LIMIT 1`,
        [ventaId, item.id]
      );
      if (detalleExistente.length) {
        detalles[key] = detalleExistente[0].id;
      } else {
        const { rows } = await client.query(
          `INSERT INTO venta_detalle (venta_id, tipo, producto_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, 'producto', $2, 1, 1000, 862.07)
           RETURNING id`,
          [ventaId, item.id]
        );
        detalles[key] = rows[0].id;
      }
    }

    // 3) Reset de reclamos previos — cascada borra items y componentes.
    //    garantia_solicitudes / garantia_solicitud_items / _componentes no tienen
    //    trigger de auditoría (solo `inventario` lo tiene), así que no requieren
    //    setAuditContext — solo la transacción para atomicidad.
    await client.query(`DELETE FROM garantia_solicitudes WHERE venta_id = $1`, [ventaId]);

    await client.query("COMMIT");
    console.log(`✔ Venta fixture [E2E] Cliente Garantías (id=${ventaId}) lista y sin reclamos previos`);

    console.log(
      `✔ Inventario garantías: componente(id=${inv.componenteReparacion.id}, stock=${STOCK_COMPONENTE_REPARACION}) ` +
      `reemplazo(id=${inv.productoReemplazo.id}, stock=${STOCK_PRODUCTO_REEMPLAZO})`
    );

    return {
      venta: {
        id: ventaId,
        itemReparacion: { ventaDetalleId: detalles.itemReparacion, descripcion: "[E2E] Producto Vendido A" },
        itemReemplazo: { ventaDetalleId: detalles.itemReemplazo, descripcion: "[E2E] Producto Vendido B" },
        itemRechazo: { ventaDetalleId: detalles.itemRechazo, descripcion: "[E2E] Producto Vendido C" },
      },
      inventario: {
        componenteReparacion: {
          id: inv.componenteReparacion.id,
          descripcion: "[E2E] Componente Reparación",
          stockInicial: STOCK_COMPONENTE_REPARACION,
        },
        productoReemplazo: {
          id: inv.productoReemplazo.id,
          descripcion: "[E2E] Producto Reemplazo",
          stockInicial: STOCK_PRODUCTO_REEMPLAZO,
        },
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function resetPedidoFixture({ adminId, sucursalId, sku, especificacion }) {
  // 1) Si quedó un inventario_id de una corrida anterior, cancela cualquier
  //    pedido activo que lo tenga atado — usando la función real del modelo
  //    (revierte sucursal_id correctamente vía moverItem, sin reimplementar
  //    esa lógica a mano).
  const { rows: existente } = await pool.query(`SELECT id FROM inventario WHERE sku = $1`, [sku]);
  if (existente.length) {
    await cancelarPedidosColgados(existente[0].id, adminId);
  }

  // 2) Upsert + fijar de vuelta en la sucursal de origen (cubre también el caso
  //    de que una corrida anterior haya COMPLETADO el pedido — cancelarPedido
  //    no puede revertir un pedido completado, así que forzamos el reset aquí).
  //    tipo='[E2E] Equipo Pedido' (igual para A y B) para que ambos aparezcan
  //    agrupados de forma predecible en ModalSeleccionEquiposPedido — el
  //    texto distintivo A/B vive en `especificacion`, que la UI muestra como
  //    "Procesador: ..." dentro de esa tarjeta (ver obtenerEquiposDisponibles
  //    en pedido.js: procesador = COALESCE(ie.procesador, i.especificacion)).
  const equipo = await withAuditContext({ userId: adminId, contexto: CONTEXTO, referenciaId: null }, (client) =>
    upsertInventarioPorSku(client, {
      sku,
      especificacion,
      tipo: "[E2E] Equipo Pedido",
      cantidad: 1,
      origen: "recepcion_directa",
      sucursal_id: sucursalId,
    })
  );

  console.log(`✔ Inventario pedidos: ${especificacion} (id=${equipo.id}, sku=${sku}) de vuelta en sucursal_id=${sucursalId}`);
  return { id: equipo.id, descripcion: especificacion, sku };
}

async function main() {
  const adminId = await obtenerUsuarioPorEmail("e2e.admin@pcmaker.test");
  const ventasUserId = await obtenerUsuarioPorEmail("e2e.ventas@pcmaker.test");
  const { origenId, destinoId } = await obtenerSucursales();

  const garantias = await resetGarantiaFixtures({ adminId, ventasUserId, sucursalId: origenId });

  const equipoPedidoCompletar = await resetPedidoFixture({
    adminId,
    sucursalId: origenId,
    sku: SKU.equipoPedidoCompletar,
    especificacion: "[E2E] Equipo Pedido A",
  });
  const equipoPedidoCancelar = await resetPedidoFixture({
    adminId,
    sucursalId: origenId,
    sku: SKU.equipoPedidoCancelar,
    especificacion: "[E2E] Equipo Pedido B",
  });

  const fixtures = {
    sucursalOrigenId: origenId,
    sucursalDestinoId: destinoId,
    venta: garantias.venta,
    inventario: {
      ...garantias.inventario,
      equipoPedidoCompletar,
      equipoPedidoCancelar,
    },
  };

  fs.writeFileSync(FIXTURES_OUT, JSON.stringify(fixtures, null, 2));
  console.log(`✔ Fixtures escritos en ${FIXTURES_OUT}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Error sembrando fixtures E2E:", err);
  process.exit(1);
});

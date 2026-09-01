/**
 * Limpia una venta de prueba creada por e2e/comisiones.spec.ts (caso de
 * comisión de venta) y todo lo que le pertenece: comisión, detalle, pagos y
 * el movimiento de caja que registró `registrarVenta`.
 *
 * No existe DELETE /api/ventas/:id — las ventas no se pueden borrar vía API
 * por diseño del ERP (ver ausencia de esa ruta en
 * backend/src/routes/ventasRutas.js) — así que este cleanup va directo a BD,
 * igual que ya hace backend/scripts/seedE2EFixtures.js con `ventas` /
 * `venta_detalle` (esas tablas no tienen trigger de auditoría, solo
 * `inventario` lo tiene — ver database/migrations/004_auditoria_inventario.sql
 * — así que es una transacción simple, sin setAuditContext).
 *
 * Se invoca como subproceso (no como require() desde el spec) para no
 * mezclar este pool de pg con el proceso de Playwright — mismo motivo que
 * documenta e2e/global-setup.ts para el seed.
 *
 * Uso: node scripts/limpiarVentaE2E.js <ventaId>
 */
const pool = require("../src/config/db");

async function main() {
  const ventaId = Number(process.argv[2]);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    throw new Error("Uso: node scripts/limpiarVentaE2E.js <ventaId>");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM comisiones WHERE venta_id = $1`, [ventaId]);
    await client.query(`DELETE FROM venta_detalle WHERE venta_id = $1`, [ventaId]);
    await client.query(`DELETE FROM ventas_pagos WHERE venta_id = $1`, [ventaId]);
    // registrarMovimiento no guarda venta_id en caja_movimientos — se identifica
    // por la descripción fija que arma registrarVenta (ver models/ventas.js).
    await client.query(`DELETE FROM caja_movimientos WHERE descripcion LIKE $1`, [`Venta #${ventaId} -%`]);
    await client.query(`DELETE FROM ventas WHERE id = $1`, [ventaId]);
    await client.query("COMMIT");
    console.log(`✔ Venta E2E #${ventaId} y sus filas relacionadas fueron eliminadas`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Error limpiando venta E2E:", err);
  process.exit(1);
});

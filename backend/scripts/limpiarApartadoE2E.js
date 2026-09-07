/**
 * Borra un apartado de prueba creado por e2e/apartados.spec.ts. No existe
 * DELETE /api/apartados/:id (solo cancelar, que requiere estado='activo' y
 * no aplica a uno ya liquidado) — por eso este cleanup va directo a BD, igual
 * que backend/scripts/limpiarVentaE2E.js.
 *
 * apartado_abonos se borra en cascada (ON DELETE CASCADE, ver
 * database/migrations/002_apartados.sql) — no hace falta un DELETE aparte.
 *
 * Si el apartado fue liquidado, limpia primero este apartado (libera el FK
 * apartados.venta_id) y LUEGO la venta con backend/scripts/limpiarVentaE2E.js
 * — nunca al revés, o falla por FK.
 *
 * Uso: node scripts/limpiarApartadoE2E.js <apartadoId>
 */
const pool = require("../src/config/db");

async function main() {
  const apartadoId = Number(process.argv[2]);
  if (!Number.isInteger(apartadoId) || apartadoId <= 0) {
    throw new Error("Uso: node scripts/limpiarApartadoE2E.js <apartadoId>");
  }

  await pool.query(`DELETE FROM apartados WHERE id = $1`, [apartadoId]);
  console.log(`✔ Apartado E2E #${apartadoId} eliminado`);

  await pool.end();
}

main().catch((err) => {
  console.error("Error limpiando apartado E2E:", err);
  process.exit(1);
});

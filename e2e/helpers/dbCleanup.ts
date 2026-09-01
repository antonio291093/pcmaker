import { execFileSync } from 'child_process'
import path from 'path'

/**
 * Borra una venta de prueba y todo lo que le pertenece (comisión, detalle,
 * pagos, movimiento de caja). No hay DELETE /api/ventas/:id — por eso este
 * cleanup corre como subproceso contra backend/scripts/limpiarVentaE2E.js
 * en vez de una llamada a la API (mismo patrón/motivo que
 * e2e/global-setup.ts usa para el seed: no mezclar el pool de pg del backend
 * con el proceso de Playwright).
 */
export function limpiarVentaComision(ventaId: number) {
  execFileSync('node', ['scripts/limpiarVentaE2E.js', String(ventaId)], {
    cwd: path.resolve(__dirname, '../../backend'),
    stdio: 'inherit',
  })
}

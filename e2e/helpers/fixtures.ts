import fs from 'fs'
import path from 'path'

export interface Fixtures {
  sucursalOrigenId: number
  sucursalDestinoId: number
  venta: {
    id: number
    itemReparacion: { ventaDetalleId: number; descripcion: string }
    itemReemplazo: { ventaDetalleId: number; descripcion: string }
    itemRechazo: { ventaDetalleId: number; descripcion: string }
  }
  inventario: {
    componenteReparacion: { id: number; descripcion: string; stockInicial: number }
    productoReemplazo: { id: number; descripcion: string; stockInicial: number }
    equipoPedidoCompletar: { id: number; descripcion: string; sku: string }
    equipoPedidoCancelar: { id: number; descripcion: string; sku: string }
  }
  comisiones: {
    productoVenta: { id: number; precio: number; stockInicial: number }
    catalogoMantenimientoNormal: { id: number; costo: number }
    catalogoMantenimientoOtro: { id: number; costo: number }
  }
  apartados: {
    productoApartado: { id: number; precio: number; stockInicial: number; descripcion: string; sku: string }
  }
}

/** Lee e2e/.fixtures.json, escrito por backend/scripts/seedE2EFixtures.js (globalSetup). */
export function leerFixtures(): Fixtures {
  const file = path.join(__dirname, '..', '.fixtures.json')
  if (!fs.existsSync(file)) {
    throw new Error(
      'e2e/.fixtures.json no existe — corre backend/scripts/seedE2EFixtures.js (o el globalSetup de Playwright) primero.'
    )
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

// El frontend llama al backend directo por API_URL (no hay proxy /api en next dev).
export const API_URL = process.env.E2E_API_URL || 'http://localhost:5000'

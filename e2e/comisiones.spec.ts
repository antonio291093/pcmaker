import { test, expect, Page } from '@playwright/test'
import { leerFixtures, API_URL } from './helpers/fixtures'
import { filaComision } from './helpers/panels'
import { limpiarVentaComision } from './helpers/dbCleanup'

// Cada test crea y limpia su propia comisión (venta / armado / mantenimiento
// normal / mantenimiento "otro"). Serial por simplicidad — el único recurso
// compartido es el stock del producto de venta fixture, que alcanza de sobra
// para varias corridas seguidas (se resetea en cada seed, ver
// backend/scripts/seedE2EFixtures.js).
test.describe.configure({ mode: 'serial' })

const fixtures = leerFixtures()
const SELLO = Date.now() // texto distintivo por corrida — evita choques con una fila que un cleanup previo no haya podido borrar

async function obtenerUsuarioActual(page: Page) {
  const resp = await page.request.get(`${API_URL}/api/usuarios/me`)
  expect(resp.ok()).toBeTruthy()
  const { user } = await resp.json()
  return user as { id: number; sucursal_id: number; rol_id: number }
}

/** Tasa/monto fijo vigente en `configuraciones` — igual fallback que usa el backend si la clave no existe. */
async function obtenerConfigNumerica(page: Page, nombre: string, fallback: number): Promise<number> {
  const resp = await page.request.get(`${API_URL}/api/configuraciones/${nombre}`)
  if (!resp.ok()) return fallback
  const data = await resp.json()
  const parsed = parseFloat(data?.valor)
  return Number.isNaN(parsed) ? fallback : parsed
}

async function abrirPestanaComisiones(page: Page, ruta: '/ventas' | '/tecnico') {
  await page.goto(ruta)
  await page.locator('aside').getByRole('button', { name: 'Comisiones' }).click()
}

test('comisión de venta — se genera server-side sobre el subtotal de productos', async ({ page }) => {
  const me = await obtenerUsuarioActual(page)
  const { id: productoId, precio } = fixtures.comisiones.productoVenta

  const tasa = await obtenerConfigNumerica(page, 'comision_ventas', 0.03)
  const montoEsperado = Number((precio * tasa).toFixed(2))

  const ventaResp = await page.request.post(`${API_URL}/api/ventas`, {
    data: {
      cliente: `[E2E] Cliente Comisión Venta ${SELLO}`,
      pagos: [{ metodo: 'efectivo', monto: precio }],
      productos: [{ id: productoId, cantidad: 1, precio_unitario: precio }],
      servicios: [],
      observaciones: `[E2E] comision-venta ${SELLO}`,
      usuario_id: me.id,
      sucursal_id: fixtures.sucursalOrigenId,
      requiere_factura: false,
    },
  })
  expect(ventaResp.ok(), await ventaResp.text()).toBeTruthy()
  const { venta_id: ventaId } = await ventaResp.json()

  try {
    // BD (vía API): la comisión debe existir con el monto esperado — mismo endpoint que consume ComisionesCard.
    const semana = await (await page.request.get(`${API_URL}/api/comisiones/semana?usuario_id=${me.id}`)).json()
    const fila = semana.find((c: any) => c.tipo === 'venta' && c.venta?.id === ventaId)
    expect(fila, 'debe existir una comisión de tipo venta para esta venta').toBeTruthy()
    expect(Number(fila.monto)).toBeCloseTo(montoEsperado, 2)
    expect(Number(fila.monto)).toBeGreaterThan(0)

    // UI: debe reflejarse en ComisionesCard del vendedor.
    await abrirPestanaComisiones(page, '/ventas')
    const filaUI = filaComision(page, `Venta #${ventaId}`)
    await expect(filaUI).toBeVisible()
    await expect(filaUI).toContainText(`$${montoEsperado.toFixed(2)}`)
  } finally {
    limpiarVentaComision(ventaId)
  }
})

test('comisión de armado de equipo — monto fijo de configuraciones.comision_armado', async ({ browser }) => {
  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  try {
    const me = await obtenerUsuarioActual(tecnicoPage)
    const montoEsperado = await obtenerConfigNumerica(tecnicoPage, 'comision_armado', 20)
    const nombreEquipo = `[E2E] Equipo Comisión Armado ${SELLO}`

    // Sin lote/RAM/almacenamiento: lote_etiqueta_id es NULLABLE y la comisión
    // de armado solo depende de estado_id === 4 (ver controladorEquipos.js).
    const equipoResp = await tecnicoPage.request.post(`${API_URL}/api/equipos`, {
      data: {
        nombre: nombreEquipo,
        descripcion: '[E2E] equipo de prueba para comisión de armado',
        tipo: 'equipo',
        procesador: '[E2E] Procesador Test',
        estado_id: 4,
        sucursal_id: fixtures.sucursalOrigenId,
      },
    })
    expect(equipoResp.ok(), await equipoResp.text()).toBeTruthy()
    const equipo = await equipoResp.json()

    let comisionId: number | null = null
    try {
      // BD (vía API): endpoint dedicado por equipo_id.
      const comision = await (await tecnicoPage.request.get(`${API_URL}/api/comisiones/equipo/${equipo.id}`)).json()
      expect(comision, 'debe existir una comisión para este equipo').toBeTruthy()
      expect(Number(comision.monto)).toBeCloseTo(montoEsperado, 2)
      expect(Number(comision.monto)).toBeGreaterThan(0)
      expect(comision.usuario_id).toBe(me.id)
      comisionId = comision.id

      // UI: debe reflejarse en ComisionesCard del técnico.
      await abrirPestanaComisiones(tecnicoPage, '/tecnico')
      const filaUI = filaComision(tecnicoPage, nombreEquipo)
      await expect(filaUI).toBeVisible()
      await expect(filaUI).toContainText(`$${montoEsperado.toFixed(2)}`)
    } finally {
      if (comisionId) await tecnicoPage.request.delete(`${API_URL}/api/comisiones/${comisionId}`)
      await tecnicoPage.request.delete(`${API_URL}/api/equipos/${equipo.id}`)
    }
  } finally {
    await tecnicoContext.close()
  }
})

async function probarComisionMantenimiento(
  browser: import('@playwright/test').Browser,
  opts: { catalogoId: number; costo: number; detalle: string }
) {
  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  try {
    const me = await obtenerUsuarioActual(tecnicoPage)
    const tasa = await obtenerConfigNumerica(tecnicoPage, 'comision_mantenimiento', 0.03)
    const montoEsperado = Number((opts.costo * tasa).toFixed(2))

    const mantenimientoResp = await tecnicoPage.request.post(`${API_URL}/api/mantenimientos`, {
      data: {
        fecha_mantenimiento: new Date().toISOString().split('T')[0],
        detalle: opts.detalle,
        tecnico_id: me.id,
        sucursal_id: fixtures.sucursalOrigenId,
        catalogo_id: opts.catalogoId,
      },
    })
    expect(mantenimientoResp.ok(), await mantenimientoResp.text()).toBeTruthy()
    const mantenimiento = await mantenimientoResp.json()

    let comisionId: number | null = null
    try {
      // BD (vía API): mismo endpoint que consume ComisionesCard.
      const semana = await (await tecnicoPage.request.get(`${API_URL}/api/comisiones/semana?usuario_id=${me.id}`)).json()
      const fila = semana.find((c: any) => c.tipo === 'mantenimiento' && c.mantenimiento?.id === mantenimiento.id)
      expect(fila, 'debe existir una comisión de tipo mantenimiento para este mantenimiento').toBeTruthy()
      expect(Number(fila.monto)).toBeCloseTo(montoEsperado, 2)
      // Guarda de regresión del Hallazgo A: el monto nunca debe colapsar a 0.
      expect(Number(fila.monto)).toBeGreaterThan(0)
      comisionId = fila.id

      // UI: debe reflejarse en ComisionesCard del técnico.
      await abrirPestanaComisiones(tecnicoPage, '/tecnico')
      const filaUI = filaComision(tecnicoPage, opts.detalle)
      await expect(filaUI).toBeVisible()
      await expect(filaUI).toContainText(`$${montoEsperado.toFixed(2)}`)
    } finally {
      if (comisionId) await tecnicoPage.request.delete(`${API_URL}/api/comisiones/${comisionId}`)
      await tecnicoPage.request.delete(`${API_URL}/api/mantenimientos/${mantenimiento.id}`)
    }
  } finally {
    await tecnicoContext.close()
  }
}

test('comisión de mantenimiento — catálogo con costo fijo', async ({ browser }) => {
  await probarComisionMantenimiento(browser, {
    catalogoId: fixtures.comisiones.catalogoMantenimientoNormal.id,
    costo: fixtures.comisiones.catalogoMantenimientoNormal.costo,
    detalle: `[E2E] comision-mantenimiento-normal ${SELLO}`,
  })
})

test('comisión de mantenimiento — catálogo "Otro" con costo personalizado (regresión Hallazgo A)', async ({ browser }) => {
  await probarComisionMantenimiento(browser, {
    catalogoId: fixtures.comisiones.catalogoMantenimientoOtro.id,
    costo: fixtures.comisiones.catalogoMantenimientoOtro.costo,
    detalle: `[E2E] comision-mantenimiento-otro ${SELLO}`,
  })
})

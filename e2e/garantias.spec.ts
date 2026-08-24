import { test, expect, Page } from '@playwright/test'
import { leerFixtures, API_URL } from './helpers/fixtures'
import { cerrarSwal } from './helpers/swal'
import { filaGarantia, panelGarantia } from './helpers/panels'

// Los 3 tests comparten inventario de stock (componente/reemplazo) — correrlos
// en paralelo introduciría carreras en las aserciones de stock. Cada uno usa
// un artículo distinto de la misma venta fixture, así que el orden no importa
// para la lógica en sí, solo para evitar esas carreras.
test.describe.configure({ mode: 'serial' })

const fixtures = leerFixtures()

async function crearSolicitud(page: Page, itemDescripcion: string, motivo: string): Promise<number> {
  await page.goto('/ventas')
  await page.locator('aside').getByRole('button', { name: 'Garantías' }).click()
  await page.getByRole('button', { name: 'Nueva solicitud' }).click()

  await page.getByPlaceholder('Número de venta').fill(String(fixtures.venta.id))
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page.getByText('[E2E] Cliente Garantías')).toBeVisible()

  await page.getByRole('checkbox', { name: itemDescripcion }).check()
  await page.getByPlaceholder('Describe el problema reportado por el cliente...').fill(motivo)

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/garantia-solicitudes') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Crear solicitud' }).click(),
  ])
  const data = await resp.json()
  await cerrarSwal(page)

  return data.id as number
}

async function tomarCasoYAbrirDiagnostico(tecnicoPage: Page, solicitudId: number, diagnostico: string) {
  await tecnicoPage.goto('/tecnico')
  await tecnicoPage.locator('aside').getByRole('button', { name: 'Garantías' }).click()

  await filaGarantia(tecnicoPage, solicitudId).click()
  await tecnicoPage.getByRole('button', { name: 'Tomar caso' }).click()
  await cerrarSwal(tecnicoPage)

  await panelGarantia(tecnicoPage).getByPlaceholder('Describe el diagnóstico técnico...').fill(diagnostico)
}

test('flujo completo — reparación', async ({ page, browser }) => {
  const solicitudId = await crearSolicitud(page, fixtures.venta.itemReparacion.descripcion, '[E2E] no enciende')
  await expect(filaGarantia(page, solicitudId)).toContainText('Solicitada')

  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  await tomarCasoYAbrirDiagnostico(tecnicoPage, solicitudId, '[E2E] diagnóstico: falla de fuente de poder')
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Sí', exact: true }).click()

  // Tipo de resolución ya viene por default en "Reparación" (useState('reparacion')).
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Seleccionar componentes' }).click()
  await tecnicoPage.getByText(fixtures.inventario.componenteReparacion.descripcion, { exact: true }).click()
  await tecnicoPage.getByRole('button', { name: /Seleccionar \(1\)/ }).click()

  const [resolverResp] = await Promise.all([
    tecnicoPage.waitForResponse(
      (r) => r.url().includes(`/garantia-solicitudes/${solicitudId}/resolver`) && r.request().method() === 'PUT'
    ),
    panelGarantia(tecnicoPage).getByRole('button', { name: 'Resolver' }).click(),
  ])
  expect(resolverResp.ok()).toBeTruthy()
  await cerrarSwal(tecnicoPage)

  await expect(filaGarantia(tecnicoPage, solicitudId)).toContainText('Resuelta')

  const inv = await (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.componenteReparacion.id}`)).json()
  expect(inv.cantidad).toBe(fixtures.inventario.componenteReparacion.stockInicial - 1)

  await tecnicoContext.close()
})

test('flujo completo — reemplazo', async ({ page, browser }) => {
  const solicitudId = await crearSolicitud(page, fixtures.venta.itemReemplazo.descripcion, '[E2E] pantalla rota')
  await expect(filaGarantia(page, solicitudId)).toContainText('Solicitada')

  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  await tomarCasoYAbrirDiagnostico(tecnicoPage, solicitudId, '[E2E] diagnóstico: panel dañado, requiere reemplazo')
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Sí', exact: true }).click()

  await panelGarantia(tecnicoPage).getByRole('combobox').selectOption({ label: 'Reemplazo' })
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Seleccionar producto' }).click()
  await tecnicoPage.getByText(fixtures.inventario.productoReemplazo.descripcion, { exact: true }).click()
  await tecnicoPage.getByRole('button', { name: /Seleccionar \(1\)/ }).click()

  await panelGarantia(tecnicoPage).getByPlaceholder('0.00').fill('150')

  const [resolverResp] = await Promise.all([
    tecnicoPage.waitForResponse(
      (r) => r.url().includes(`/garantia-solicitudes/${solicitudId}/resolver`) && r.request().method() === 'PUT'
    ),
    panelGarantia(tecnicoPage).getByRole('button', { name: 'Resolver' }).click(),
  ])
  expect(resolverResp.ok()).toBeTruthy()
  await cerrarSwal(tecnicoPage)

  await expect(filaGarantia(tecnicoPage, solicitudId)).toContainText('Resuelta')
  await expect(panelGarantia(tecnicoPage).getByText(/Diferencia cobrada/)).toBeVisible()

  const inv = await (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.productoReemplazo.id}`)).json()
  expect(inv.cantidad).toBe(fixtures.inventario.productoReemplazo.stockInicial - 1)

  await tecnicoContext.close()
})

test('rechazo de solicitud', async ({ page, browser }) => {
  const solicitudId = await crearSolicitud(page, fixtures.venta.itemRechazo.descripcion, '[E2E] cliente reporta falla intermitente')
  await expect(filaGarantia(page, solicitudId)).toContainText('Solicitada')

  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  // Snapshot de stock ANTES de rechazar — el rechazo no debe tocar ningún inventario.
  const [stockComponenteAntes, stockReemplazoAntes] = await Promise.all([
    (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.componenteReparacion.id}`)).json(),
    (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.productoReemplazo.id}`)).json(),
  ])

  await tomarCasoYAbrirDiagnostico(tecnicoPage, solicitudId, '[E2E] diagnóstico: daño por mal uso, no cubre garantía')
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'No', exact: true }).click()
  // El textarea de "Motivo de rechazo" no tiene placeholder — es el segundo
  // <textarea> del panel (el primero es el de diagnóstico, ya lleno).
  await panelGarantia(tecnicoPage).locator('textarea').nth(1).fill('[E2E] daño físico por caída, fuera de cobertura')

  const [diagnosticoResp] = await Promise.all([
    tecnicoPage.waitForResponse(
      (r) => r.url().includes(`/garantia-solicitudes/${solicitudId}/diagnostico`) && r.request().method() === 'PUT'
    ),
    panelGarantia(tecnicoPage).getByRole('button', { name: 'Rechazar solicitud' }).click(),
  ])
  expect(diagnosticoResp.ok()).toBeTruthy()
  await cerrarSwal(tecnicoPage)

  await expect(filaGarantia(tecnicoPage, solicitudId)).toContainText('Rechazada')

  const [stockComponenteDespues, stockReemplazoDespues] = await Promise.all([
    (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.componenteReparacion.id}`)).json(),
    (await tecnicoPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.productoReemplazo.id}`)).json(),
  ])
  expect(stockComponenteDespues.cantidad).toBe(stockComponenteAntes.cantidad)
  expect(stockReemplazoDespues.cantidad).toBe(stockReemplazoAntes.cantidad)

  await tecnicoContext.close()
})

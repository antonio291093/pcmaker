import { test, expect, Page } from '@playwright/test'
import { leerFixtures, API_URL } from './helpers/fixtures'
import { panelPedido } from './helpers/panels'

// Cada test crea y consume su propio equipo fixture (A para completar, B para
// cancelar) — serial solo para mantener predecible cuál es "la fila más
// reciente" al abrir la lista justo después de crear (no hay columna de ID
// visible en la tabla de pedidos).
test.describe.configure({ mode: 'serial' })

const fixtures = leerFixtures()
const TECNICO_NOMBRE = 'E2E Tecnico Test'

async function crearPedido(page: Page, equipoDescripcion: string, detalle: string): Promise<number> {
  await page.goto('/ventas')
  await page.locator('aside').getByRole('button', { name: 'Pedidos' }).click()
  await page.locator('main').getByRole('button', { name: 'Nuevo pedido' }).click()

  // Sin data-testid ni <label htmlFor>: los 3 <select> del form se ubican
  // por posición (orden confirmado en TabNuevoPedido: origen, destino, técnico).
  const selects = page.getByRole('combobox')
  await selects.nth(0).selectOption({ value: String(fixtures.sucursalOrigenId) })
  await selects.nth(1).selectOption({ value: String(fixtures.sucursalDestinoId) })
  await selects.nth(2).selectOption({ label: TECNICO_NOMBRE })

  await page.getByPlaceholder('Detalle del pedido (obligatorio)').fill(detalle)

  await page.getByRole('button', { name: '+ Seleccionar equipos' }).click()
  // Ambos fixtures de equipo comparten "tipo" (mismo nombre de grupo) — se
  // distinguen por el texto de "Procesador", que es donde vive `especificacion`
  // (ver obtenerEquiposDisponibles en pedido.js: procesador = COALESCE(ie.procesador, i.especificacion)).
  await page.getByText(`Procesador: ${equipoDescripcion}`, { exact: true }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirmar selección' }).click()

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/pedidos') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Crear pedido' }).click(),
  ])
  const data = await resp.json()
  // El controlador responde { message, pedido } — no el pedido directo (ver
  // controladorPedidos.js exports.crear: res.json({ message, pedido })).
  return data.pedido.id as number
}

/** Abre el detalle del pedido recién creado — es la fila más reciente (ORDER BY fecha_creacion DESC). */
async function abrirPedidoMasReciente(page: Page, pedidoId: number) {
  await page.locator('main').getByRole('button', { name: 'Pedidos', exact: true }).click()
  await page.getByRole('row').nth(1).click()
  await expect(panelPedido(page)).toContainText(`Pedido #${pedidoId}`)
}

test('flujo completo — completar pedido', async ({ page, browser }) => {
  const pedidoId = await crearPedido(page, fixtures.inventario.equipoPedidoCompletar.descripcion, '[E2E] test completar pedido')

  await abrirPedidoMasReciente(page, pedidoId)
  await expect(panelPedido(page)).toContainText('Pendiente')

  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()
  await tecnicoPage.goto('/tecnico')
  await tecnicoPage.locator('aside').getByRole('button', { name: 'Pedidos' }).click()

  await abrirPedidoMasReciente(tecnicoPage, pedidoId)

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Iniciar preparación' }).click()
  await expect(panelPedido(tecnicoPage)).toContainText('En preparación')

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Marcar como listo' }).click()
  await expect(panelPedido(tecnicoPage)).toContainText('Listo')

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Completar' }).click()
  await expect(panelPedido(tecnicoPage)).toContainText('Completado')

  await tecnicoContext.close()
})

test('cancelación por admin', async ({ page, browser }) => {
  const pedidoId = await crearPedido(page, fixtures.inventario.equipoPedidoCancelar.descripcion, '[E2E] test cancelar pedido')

  await abrirPedidoMasReciente(page, pedidoId)
  await expect(panelPedido(page)).toContainText('Pendiente')

  const adminContext = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/admin')
  await adminPage.locator('aside').getByRole('button', { name: 'Pedidos' }).click()

  await abrirPedidoMasReciente(adminPage, pedidoId)

  await panelPedido(adminPage).getByRole('button', { name: 'Cancelar pedido' }).click()
  // SweetAlert2 con input:'textarea' — nada de page.on('dialog'), es un modal del DOM.
  await adminPage.locator('.swal2-textarea').fill('[E2E] motivo de cancelación de prueba')
  await adminPage.locator('.swal2-confirm').click()

  await expect(panelPedido(adminPage)).toContainText('Cancelado')

  const inv = await (
    await adminPage.request.get(`${API_URL}/api/inventario/${fixtures.inventario.equipoPedidoCancelar.id}`)
  ).json()
  expect(inv.sucursal_id).toBe(fixtures.sucursalOrigenId)

  await adminContext.close()
})

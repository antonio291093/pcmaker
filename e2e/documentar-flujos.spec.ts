import { test, Page } from '@playwright/test'
import path from 'path'
import { leerFixtures } from './helpers/fixtures'
import { cerrarSwal } from './helpers/swal'
import { filaGarantia, panelGarantia, panelPedido } from './helpers/panels'

/**
 * Documentación visual de los flujos de Garantías (reparación) y Pedidos
 * (completar) ya validados en garantias.spec.ts / pedidos.spec.ts — reusa
 * los mismos helpers y selectores, pero SIN aserciones de negocio: el
 * objetivo es capturar pantallas, no validar comportamiento.
 *
 * Corre por separado del resto de la suite (project "capturas", ver
 * playwright.config.ts) porque muta datos reales de los fixtures (crea una
 * solicitud de garantía y un pedido reales). No hace falta limpieza manual:
 * el globalSetup de la siguiente corrida normal resetea los fixtures.
 */

const fixtures = leerFixtures()

const EMAIL_VENTAS = process.env.E2E_USER_EMAIL!
const PASSWORD_VENTAS = process.env.E2E_USER_PASSWORD!
const EMAIL_TECNICO = process.env.E2E_TECNICO_EMAIL!
const PASSWORD_TECNICO = process.env.E2E_TECNICO_PASSWORD!

/** Login real por UI (no storageState) para poder capturar la pantalla de login en sí. */
async function loginConCaptura(page: Page, email: string, password: string, screenshot: string) {
  await page.goto('/login')
  await page.screenshot({ path: screenshot, fullPage: true })

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(/\/(admin|tecnico|ventas)(\/|$)/, { timeout: 10_000 })
}

test.describe.configure({ mode: 'serial' })

test('documentar flujo de garantías — reparación', async ({ page, browser }) => {
  const dir = path.join(__dirname, 'capturas', 'garantias')
  const shot = (n: string) => path.join(dir, n)

  await loginConCaptura(page, EMAIL_VENTAS, PASSWORD_VENTAS, shot('01-login-ventas.png'))

  await page.locator('aside').getByRole('button', { name: 'Garantías' }).click()
  await page.screenshot({ path: shot('02-sidebar-garantias.png'), fullPage: true })

  await page.getByRole('button', { name: 'Nueva solicitud' }).click()
  await page.screenshot({ path: shot('03-nueva-solicitud-formulario-vacio.png'), fullPage: true })

  await page.getByPlaceholder('Número de venta').fill(String(fixtures.venta.id))
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('[E2E] Cliente Garantías').waitFor({ state: 'visible' })
  await page.screenshot({ path: shot('04-busqueda-venta-resultado.png'), fullPage: true })

  await page.getByRole('checkbox', { name: fixtures.venta.itemReparacion.descripcion }).check()
  await page.getByPlaceholder('Describe el problema reportado por el cliente...').fill('[E2E] no enciende — documentación')
  await page.screenshot({ path: shot('05-articulo-seleccionado-y-descripcion.png'), fullPage: true })

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/garantia-solicitudes') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Crear solicitud' }).click(),
  ])
  const { id: solicitudId } = await resp.json()
  await page.locator('.swal2-popup').waitFor({ state: 'visible' })
  await page.screenshot({ path: shot('06-solicitud-creada-confirmacion.png'), fullPage: true })
  await cerrarSwal(page)

  await page.screenshot({ path: shot('07-listado-solicitud-estado-solicitada.png'), fullPage: true })

  const tecnicoContext = await browser.newContext()
  const tecnicoPage = await tecnicoContext.newPage()

  await loginConCaptura(tecnicoPage, EMAIL_TECNICO, PASSWORD_TECNICO, shot('08-login-tecnico.png'))

  await tecnicoPage.locator('aside').getByRole('button', { name: 'Garantías' }).click()
  await filaGarantia(tecnicoPage, solicitudId).click()
  await tecnicoPage.screenshot({ path: shot('09-panel-detalle-tomar-caso.png'), fullPage: true })

  await tecnicoPage.getByRole('button', { name: 'Tomar caso' }).click()
  await cerrarSwal(tecnicoPage)

  await panelGarantia(tecnicoPage)
    .getByPlaceholder('Describe el diagnóstico técnico...')
    .fill('[E2E] diagnóstico: falla de fuente de poder — documentación')
  await tecnicoPage.screenshot({ path: shot('10-diagnostico-tecnico-formulario.png'), fullPage: true })

  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Sí', exact: true }).click()
  // Tipo de resolución ya viene por default en "Reparación".
  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Seleccionar componentes' }).click()
  await tecnicoPage.getByText(fixtures.inventario.componenteReparacion.descripcion, { exact: true }).click()
  await tecnicoPage.getByRole('button', { name: /Seleccionar \(1\)/ }).click()
  await tecnicoPage.screenshot({ path: shot('11-tipo-resolucion-reparacion-seleccion-componente.png'), fullPage: true })

  await panelGarantia(tecnicoPage).getByRole('button', { name: 'Resolver' }).click()
  await tecnicoPage.locator('.swal2-popup').waitFor({ state: 'visible' })
  await tecnicoPage.screenshot({ path: shot('12-solicitud-resuelta-confirmacion.png'), fullPage: true })
  await cerrarSwal(tecnicoPage)

  await tecnicoContext.close()
})

test('documentar flujo de pedidos — completar', async ({ page, browser }) => {
  const dir = path.join(__dirname, 'capturas', 'pedidos')
  const shot = (n: string) => path.join(dir, n)

  await loginConCaptura(page, EMAIL_VENTAS, PASSWORD_VENTAS, shot('01-login-ventas.png'))

  await page.locator('aside').getByRole('button', { name: 'Pedidos' }).click()
  await page.screenshot({ path: shot('02-sidebar-pedidos.png'), fullPage: true })

  await page.locator('main').getByRole('button', { name: 'Nuevo pedido' }).click()
  const selects = page.getByRole('combobox')
  await selects.nth(0).selectOption({ value: String(fixtures.sucursalOrigenId) })
  await selects.nth(1).selectOption({ value: String(fixtures.sucursalDestinoId) })
  await selects.nth(2).selectOption({ label: 'E2E Tecnico Test' })
  await page.getByPlaceholder('Detalle del pedido (obligatorio)').fill('[E2E] documentación — completar pedido')
  await page.screenshot({ path: shot('03-formulario-nuevo-pedido.png'), fullPage: true })

  await page.getByRole('button', { name: '+ Seleccionar equipos' }).click()
  await page.getByText(`Procesador: ${fixtures.inventario.equipoPedidoCompletar.descripcion}`, { exact: true }).click()
  await page.getByRole('checkbox').check()
  await page.screenshot({ path: shot('04-seleccion-equipos.png'), fullPage: true })
  await page.getByRole('button', { name: 'Confirmar selección' }).click()

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/pedidos') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Crear pedido' }).click(),
  ])
  await page.locator('.swal2-popup').waitFor({ state: 'visible' })
  await page.screenshot({ path: shot('05-pedido-creado.png'), fullPage: true })

  await page.locator('main').getByRole('button', { name: 'Pedidos', exact: true }).click()
  await page.getByRole('row').nth(1).click()

  const tecnicoContext = await browser.newContext()
  const tecnicoPage = await tecnicoContext.newPage()

  await loginConCaptura(tecnicoPage, EMAIL_TECNICO, PASSWORD_TECNICO, shot('06-login-tecnico.png'))

  await tecnicoPage.locator('aside').getByRole('button', { name: 'Pedidos' }).click()
  await tecnicoPage.locator('main').getByRole('button', { name: 'Pedidos', exact: true }).click()
  await tecnicoPage.getByRole('row').nth(1).click()

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Iniciar preparación' }).click()
  await tecnicoPage.screenshot({ path: shot('07-iniciar-preparacion.png'), fullPage: true })

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Marcar como listo' }).click()
  await tecnicoPage.screenshot({ path: shot('08-marcar-listo.png'), fullPage: true })

  await panelPedido(tecnicoPage).getByRole('button', { name: 'Completar' }).click()
  await tecnicoPage.screenshot({ path: shot('09-completar.png'), fullPage: true })

  await tecnicoPage.locator('main').getByRole('button', { name: 'Pedidos', exact: true }).click()
  await tecnicoPage.screenshot({ path: shot('10-confirmacion-final.png'), fullPage: true })

  await tecnicoContext.close()
})

import { test, expect, Page, Locator } from '@playwright/test'
import { leerFixtures, API_URL } from './helpers/fixtures'
import { cerrarSwal } from './helpers/swal'
import { panelApartado } from './helpers/panels'
import { limpiarApartado, limpiarVentaComision } from './helpers/dbCleanup'

/**
 * Todos los tests comparten el mismo producto fixture (stock fijo, ver
 * backend/scripts/seedE2EFixtures.js → resetApartadosFixtures) y cada uno
 * limpia su propio apartado al final (backend/scripts/limpiarApartadoE2E.js)
 * — serial por el mismo motivo que comisiones.spec.ts: evitar carreras sobre
 * ese stock compartido, no por dependencia de orden entre los casos.
 */
test.describe.configure({ mode: 'serial' })

const fixtures = leerFixtures()
const SELLO = Date.now()

type Metodo = 'efectivo' | 'transferencia' | 'terminal'

interface ConfigApartados {
  enganche_tipo: 'porcentaje' | 'fijo'
  enganche_valor: number
  dias_limite: number
  dias_sin_abono: number
}

interface ApartadoDetalle {
  id: number
  estado: 'activo' | 'liquidado' | 'cancelado'
  precio_total: string
  monto_abonado: string
  venta_id: number | null
  abonos: { id: number; monto: string; metodo_pago: string }[]
}

// ─── Helpers de datos (BD vía API) ─────────────────────────────

/** Config vigente en `configuraciones` — los tests nunca asumen 30%/30 días fijos. */
async function obtenerConfigApartados(page: Page): Promise<ConfigApartados> {
  const resp = await page.request.get(`${API_URL}/api/apartados/configuraciones`)
  expect(resp.ok(), await resp.text()).toBeTruthy()
  const data = await resp.json()
  return {
    enganche_tipo: data.enganche_tipo,
    enganche_valor: Number(data.enganche_valor),
    dias_limite: Number(data.dias_limite),
    dias_sin_abono: Number(data.dias_sin_abono),
  }
}

/** Misma fórmula que ModalNuevoApartado (frontend) y crear() (backend) — ver Apartados.tsx / controladorApartados.js. */
function calcularEngancheMinimo(config: ConfigApartados, precioTotal: number): number {
  return config.enganche_tipo === 'fijo'
    ? config.enganche_valor
    : Number(((precioTotal * config.enganche_valor) / 100).toFixed(2))
}

/** Mismo formateo que formatMXN en Apartados.tsx, para comparar contra el texto renderizado. */
function formatMXN(val: number): string {
  return val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

async function obtenerApartado(page: Page, id: number): Promise<ApartadoDetalle> {
  const resp = await page.request.get(`${API_URL}/api/apartados/${id}`)
  expect(resp.ok(), await resp.text()).toBeTruthy()
  return resp.json()
}

/** Crea un apartado directo vía API (setup rápido para los tests que no prueban la creación en sí). */
async function crearApartadoViaAPI(
  page: Page,
  opts: { clienteNombre: string; montoEnganche: number; metodoPago?: Metodo }
): Promise<{ apartadoId: number; precioTotal: number; engancheMinimo: number }> {
  const resp = await page.request.post(`${API_URL}/api/apartados`, {
    data: {
      producto_id: fixtures.apartados.productoApartado.id,
      cantidad: 1,
      sucursal_id: fixtures.sucursalOrigenId,
      cliente: { nombre: opts.clienteNombre },
      monto_enganche: opts.montoEnganche,
      metodo_pago_enganche: opts.metodoPago ?? 'efectivo',
    },
  })
  expect(resp.ok(), await resp.text()).toBeTruthy()
  const data = await resp.json()
  return { apartadoId: data.apartado_id, precioTotal: Number(data.precio_total), engancheMinimo: Number(data.enganche_minimo) }
}

// ─── Helpers de UI ──────────────────────────────────────────────

async function abrirApartados(page: Page) {
  await page.goto('/ventas')
  await page.locator('aside').getByRole('button', { name: 'Apartados' }).click()
  await expect(page.getByRole('heading', { name: 'Apartados' })).toBeVisible()
}

/** Fila de un apartado en la lista, por texto distintivo (nombre de cliente marcado [E2E]). */
function filaApartado(page: Page, textoDistintivo: string): Locator {
  return page.locator('button').filter({ hasText: textoDistintivo })
}

async function abrirDetalle(page: Page, apartadoId: number, textoDistintivo: string) {
  await filaApartado(page, textoDistintivo).click()
  await expect(page.getByRole('heading', { name: `Apartado #${apartadoId}` })).toBeVisible()
}

/** Único <input type="number"> visible en cada momento del flujo (SeleccionarProductoModal ya está cerrado). */
function inputNumerico(page: Page): Locator {
  return page.locator('input[type="number"]')
}

function botonMetodo(page: Page, metodo: Metodo): Locator {
  return page.getByRole('button', { name: metodo, exact: true })
}

// ─── 1. Crear apartado ──────────────────────────────────────────

test('crear apartado — enganche válido, estado inicial "activo" y saldo correcto', async ({ page }) => {
  const clienteNombre = `[E2E] Cliente Apartado Crear ${SELLO}`
  const precioTotal = fixtures.apartados.productoApartado.precio
  const config = await obtenerConfigApartados(page)
  const engancheMinimo = calcularEngancheMinimo(config, precioTotal)
  const saldoEsperado = Number((precioTotal - engancheMinimo).toFixed(2))

  await abrirApartados(page)
  await page.getByRole('button', { name: 'Nuevo apartado', exact: true }).click()

  await page.getByRole('button', { name: 'Seleccionar producto', exact: true }).click()
  await page.getByText(fixtures.apartados.productoApartado.descripcion, { exact: true }).click()
  await page.getByRole('button', { name: /Seleccionar \(1\)/ }).click()

  await page.getByPlaceholder('Nombre completo').fill(clienteNombre)
  await inputNumerico(page).fill(String(engancheMinimo))
  // Método de pago del enganche: 'efectivo' ya viene seleccionado por default (useState inicial).

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/apartados') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Crear apartado', exact: true }).click(),
  ])
  expect(resp.ok(), await resp.text()).toBeTruthy()
  const creado = await resp.json()
  const apartadoId = creado.apartado_id as number

  try {
    // Respuesta del backend: enganche_minimo y monto_abonado calculados server-side.
    expect(Number(creado.precio_total)).toBeCloseTo(precioTotal, 2)
    expect(Number(creado.enganche_minimo)).toBeCloseTo(engancheMinimo, 2)
    expect(Number(creado.monto_abonado)).toBeCloseTo(engancheMinimo, 2)

    await cerrarSwal(page) // "Apartado creado" — Folio #<id>

    // BD (vía API): estado inicial real del schema es 'activo' (CHECK apartados_estado_check), no "pendiente".
    const apartado = await obtenerApartado(page, apartadoId)
    expect(apartado.estado).toBe('activo')
    expect(Number(apartado.precio_total)).toBeCloseTo(precioTotal, 2)
    expect(Number(apartado.monto_abonado)).toBeCloseTo(engancheMinimo, 2)
    expect(apartado.abonos).toHaveLength(1)
    expect(apartado.abonos[0].metodo_pago).toBe('efectivo')
    expect(Number(apartado.abonos[0].monto)).toBeCloseTo(engancheMinimo, 2)

    // UI: la lista (filtro "Activos" por default) debe mostrar el saldo correcto (total - enganche).
    const fila = filaApartado(page, clienteNombre)
    await expect(fila).toBeVisible()
    await expect(fila).toContainText(formatMXN(saldoEsperado))
    await expect(fila).toContainText(formatMXN(precioTotal))

    // UI: el detalle también debe reflejar estado "activo" y el mismo saldo.
    // Escopado a panelApartado — la fila de la lista, detrás del modal, repite el mismo badge de estado.
    await abrirDetalle(page, apartadoId, clienteNombre)
    await expect(panelApartado(page).getByText('activo', { exact: true })).toBeVisible()
    await expect(panelApartado(page).getByText(`Saldo pendiente: ${formatMXN(saldoEsperado)}`)).toBeVisible()
  } finally {
    limpiarApartado(apartadoId)
  }
})

// ─── 2. Registrar abono parcial ─────────────────────────────────

test('registrar abono parcial — actualiza saldo en BD y UI, queda en apartado_abonos', async ({ page }) => {
  const clienteNombre = `[E2E] Cliente Apartado Abono ${SELLO}`
  const precioTotal = fixtures.apartados.productoApartado.precio
  const config = await obtenerConfigApartados(page)
  const engancheMinimo = calcularEngancheMinimo(config, precioTotal)

  const { apartadoId } = await crearApartadoViaAPI(page, { clienteNombre, montoEnganche: engancheMinimo })

  try {
    const saldoAntes = Number((precioTotal - engancheMinimo).toFixed(2))
    // 40/60 (no 50/50): si el abono partiera el saldo exacto a la mitad, su monto y el
    // saldo restante coincidirían numéricamente y romperían el matching por texto en la UI.
    const montoAbono = Number((saldoAntes * 0.4).toFixed(2))
    const saldoDespues = Number((saldoAntes - montoAbono).toFixed(2))
    const montoAbonadoEsperado = Number((engancheMinimo + montoAbono).toFixed(2))

    await abrirApartados(page)
    await abrirDetalle(page, apartadoId, clienteNombre)

    await page.getByRole('button', { name: 'Abonar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Registrar abono' })).toBeVisible()
    await inputNumerico(page).fill(String(montoAbono))
    await botonMetodo(page, 'transferencia').click()

    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/apartados/${apartadoId}/abonos`) && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Registrar abono', exact: true }).click(),
    ])
    expect(resp.ok(), await resp.text()).toBeTruthy()
    await cerrarSwal(page) // "Abono registrado" — cierra todo el modal de detalle (onActualizado hace setDetalle(null))

    // BD (vía API): monto_abonado actualizado y el abono queda registrado en apartado_abonos con su método.
    const apartado = await obtenerApartado(page, apartadoId)
    expect(Number(apartado.monto_abonado)).toBeCloseTo(montoAbonadoEsperado, 2)
    expect(apartado.estado).toBe('activo') // el abono es parcial, no liquida
    expect(apartado.abonos).toHaveLength(2)
    const nuevoAbono = apartado.abonos.find((a) => Number(a.monto) === montoAbono)
    expect(nuevoAbono, 'el abono nuevo debe existir con su monto exacto').toBeTruthy()
    expect(nuevoAbono!.metodo_pago).toBe('transferencia')

    // UI: reabrir detalle (el modal se cerró tras el Swal) y confirmar el saldo actualizado.
    await abrirDetalle(page, apartadoId, clienteNombre)
    await expect(panelApartado(page).getByText(`Saldo pendiente: ${formatMXN(saldoDespues)}`)).toBeVisible()
    await expect(panelApartado(page).getByText('Abonos (2)')).toBeVisible()
    await expect(panelApartado(page).getByText(formatMXN(montoAbono))).toBeVisible()
    await expect(panelApartado(page).getByText(/transferencia/i)).toBeVisible()
  } finally {
    limpiarApartado(apartadoId)
  }
})

// ─── 3. Liquidar apartado ────────────────────────────────────────

test('liquidar apartado — abono cubre el saldo exacto, pasa a "liquidado" y bloquea nuevos abonos', async ({ page }) => {
  const clienteNombre = `[E2E] Cliente Apartado Liquidar ${SELLO}`
  const precioTotal = fixtures.apartados.productoApartado.precio
  const config = await obtenerConfigApartados(page)
  const engancheMinimo = calcularEngancheMinimo(config, precioTotal)

  const { apartadoId } = await crearApartadoViaAPI(page, { clienteNombre, montoEnganche: engancheMinimo })

  let ventaId: number | null = null
  try {
    // Setup vía API: un abono que cubre el saldo restante EXACTO (deja saldo = 0 antes de liquidar por UI).
    const saldoRestante = Number((precioTotal - engancheMinimo).toFixed(2))
    const abonoResp = await page.request.post(`${API_URL}/api/apartados/${apartadoId}/abonos`, {
      data: { monto: saldoRestante, metodo_pago: 'terminal' },
    })
    expect(abonoResp.ok(), await abonoResp.text()).toBeTruthy()

    await abrirApartados(page)
    await abrirDetalle(page, apartadoId, clienteNombre)

    await page.getByRole('button', { name: 'Liquidar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Liquidar apartado' })).toBeVisible()
    // Saldo ya en 0: no se piden métodos de pago adicionales, solo la confirmación.
    await expect(page.getByText('El apartado está completamente pagado. Confirma para generar la venta.')).toBeVisible()

    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/apartados/${apartadoId}/liquidar`) && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Confirmar liquidación', exact: true }).click(),
    ])
    expect(resp.ok(), await resp.text()).toBeTruthy()
    const liquidado = await resp.json()
    ventaId = liquidado.venta_id as number

    await expect(page.locator('.swal2-popup')).toContainText(`Venta #${ventaId} generada`)
    await cerrarSwal(page)

    // BD (vía API): estado real del schema es "liquidado" (no "completado") y venta_id enlazado.
    const apartado = await obtenerApartado(page, apartadoId)
    expect(apartado.estado).toBe('liquidado')
    expect(apartado.venta_id).toBe(ventaId)

    // UI: badge de estado refleja "liquidado" y ya no ofrece Abonar/Liquidar/Cancelar.
    // El filtro por default es "Activos" — el apartado ya liquidado ya no aparece ahí,
    // hay que cambiar a "Todos" antes de poder volver a abrir su fila.
    await page.getByRole('button', { name: 'Todos', exact: true }).click()
    await abrirDetalle(page, apartadoId, clienteNombre)
    await expect(panelApartado(page).getByText('liquidado', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abonar', exact: true })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeVisible()

    // Backend: un apartado liquidado ya no acepta abonos (registrarAbono exige estado='activo').
    const abonoTardioResp = await page.request.post(`${API_URL}/api/apartados/${apartadoId}/abonos`, {
      data: { monto: 1, metodo_pago: 'efectivo' },
    })
    expect(abonoTardioResp.status()).toBe(409)
    const errorBody = await abonoTardioResp.json()
    expect(errorBody.message).toBe('El apartado no está activo')

    // Confirma que el abono tardío rechazado no alteró el saldo.
    const apartadoFinal = await obtenerApartado(page, apartadoId)
    expect(Number(apartadoFinal.monto_abonado)).toBeCloseTo(precioTotal, 2)
  } finally {
    // Orden obligatorio: primero el apartado (libera el FK apartados.venta_id -> ventas), luego la venta.
    limpiarApartado(apartadoId)
    if (ventaId) limpiarVentaComision(ventaId)
  }
})

// ─── 4. Validación: enganche menor al mínimo (server-side) ───────

test('crear apartado — enganche menor al mínimo es rechazado por el backend (no solo por el frontend)', async ({ page }) => {
  const clienteNombre = `[E2E] Cliente Apartado Enganche Bajo ${SELLO}`
  const precioTotal = fixtures.apartados.productoApartado.precio
  const config = await obtenerConfigApartados(page)
  const engancheMinimo = calcularEngancheMinimo(config, precioTotal)
  const engancheInsuficiente = Number((engancheMinimo / 2).toFixed(2))

  // Nivel API — la validación real: crear() en controladorApartados.js compara contra
  // el enganche mínimo calculado server-side, sin confiar en lo que mande el cliente.
  const resp = await page.request.post(`${API_URL}/api/apartados`, {
    data: {
      producto_id: fixtures.apartados.productoApartado.id,
      cantidad: 1,
      sucursal_id: fixtures.sucursalOrigenId,
      cliente: { nombre: clienteNombre },
      monto_enganche: engancheInsuficiente,
      metodo_pago_enganche: 'efectivo',
    },
  })
  expect(resp.status()).toBe(400)
  const body = await resp.json()
  expect(body.message).toBe(`El enganche mínimo es $${engancheMinimo.toFixed(2)}`)

  // No debe haber quedado ningún apartado activo para este cliente.
  const listado = await page.request.get(
    `${API_URL}/api/apartados?sucursal_id=${fixtures.sucursalOrigenId}&estado=activo`
  )
  const activos = await listado.json()
  expect(activos.find((a: { cliente_nombre: string }) => a.cliente_nombre === clienteNombre)).toBeUndefined()

  // Nivel UI — el frontend también lo bloquea antes de llegar a la API (ModalNuevoApartado.handleSubmit).
  await abrirApartados(page)
  await page.getByRole('button', { name: 'Nuevo apartado', exact: true }).click()
  await page.getByRole('button', { name: 'Seleccionar producto', exact: true }).click()
  await page.getByText(fixtures.apartados.productoApartado.descripcion, { exact: true }).click()
  await page.getByRole('button', { name: /Seleccionar \(1\)/ }).click()
  await page.getByPlaceholder('Nombre completo').fill(clienteNombre)
  await inputNumerico(page).fill(String(engancheInsuficiente))

  await page.getByRole('button', { name: 'Crear apartado', exact: true }).click()
  await expect(page.locator('.swal2-popup')).toContainText('Enganche insuficiente')
  await expect(page.locator('.swal2-popup')).toContainText(`El enganche mínimo es ${formatMXN(engancheMinimo)}`)
  await cerrarSwal(page)
  // El modal de creación sigue abierto — no se cerró ni se envió nada.
  await expect(page.getByRole('button', { name: 'Crear apartado', exact: true })).toBeVisible()
})

// ─── 5. Validación: abono mayor al saldo pendiente ───────────────

test('registrar abono — monto mayor al saldo pendiente es rechazado, sin dejar saldo negativo', async ({ page }) => {
  const clienteNombre = `[E2E] Cliente Apartado Abono Excedido ${SELLO}`
  const precioTotal = fixtures.apartados.productoApartado.precio
  const config = await obtenerConfigApartados(page)
  const engancheMinimo = calcularEngancheMinimo(config, precioTotal)

  const { apartadoId } = await crearApartadoViaAPI(page, { clienteNombre, montoEnganche: engancheMinimo })

  try {
    const saldo = Number((precioTotal - engancheMinimo).toFixed(2))
    const montoExcedido = Number((saldo + 100).toFixed(2))

    await abrirApartados(page)
    await abrirDetalle(page, apartadoId, clienteNombre)

    await page.getByRole('button', { name: 'Abonar', exact: true }).click()
    // El input tiene max={saldo} en HTML, pero no es un <form> nativo — no bloquea el submit,
    // así que sí llega a golpear la API (que es lo que registrarAbono() debe rechazar).
    await inputNumerico(page).fill(String(montoExcedido))
    await botonMetodo(page, 'terminal').click()

    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/apartados/${apartadoId}/abonos`) && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Registrar abono', exact: true }).click(),
    ])
    expect(resp.status()).toBe(400)

    await expect(page.locator('.swal2-popup')).toContainText('El abono supera el total del apartado')
    await cerrarSwal(page)

    // BD (vía API): el monto_abonado no debe haber cambiado — sin saldo negativo ni sobregiro.
    const apartado = await obtenerApartado(page, apartadoId)
    expect(Number(apartado.monto_abonado)).toBeCloseTo(engancheMinimo, 2)
    expect(apartado.abonos).toHaveLength(1) // solo el enganche original
    expect(apartado.estado).toBe('activo')
  } finally {
    limpiarApartado(apartadoId)
  }
})

// ─── 6. Permisos por rol ──────────────────────────────────────────

test('permisos — técnico no tiene acceso a /ventas (RolGuard rolesPermitidos=[1,3]), admin sí', async ({ browser }) => {
  const tecnicoContext = await browser.newContext({ storageState: 'e2e/.auth/tecnico.json' })
  const tecnicoPage = await tecnicoContext.newPage()

  try {
    await tecnicoPage.goto('/ventas')
    await tecnicoPage.waitForURL(/\/login(\/|$)/, { timeout: 10_000 })
    await expect(tecnicoPage.getByRole('heading', { name: 'Apartados' })).not.toBeVisible()
  } finally {
    await tecnicoContext.close()
  }

  // Admin sí está en rolesPermitidos=[1,3] de VentasLayout — confirma que no se le bloquea la sección.
  const adminContext = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
  const adminPage = await adminContext.newPage()

  try {
    await adminPage.goto('/ventas')
    await adminPage.locator('aside').getByRole('button', { name: 'Apartados' }).click()
    await expect(adminPage.getByRole('heading', { name: 'Apartados' })).toBeVisible()
    await expect(adminPage.getByRole('button', { name: 'Nuevo apartado', exact: true })).toBeVisible()
  } finally {
    await adminContext.close()
  }
})

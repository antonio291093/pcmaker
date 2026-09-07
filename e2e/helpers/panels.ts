import { Page, Locator } from '@playwright/test'

/**
 * Sin data-testid en el proyecto (confirmado en Fase 3) — estos helpers anclan
 * a las clases Tailwind que identifican de forma única cada panel lateral en
 * el momento en que se consultan (ver GarantiasSolicitudes.tsx / PedidosPanel.tsx).
 */

/** Fila de una solicitud de garantía en la lista, por folio exacto "#<id>". */
export function filaGarantia(page: Page, id: number): Locator {
  return page.locator('button').filter({ has: page.getByText(`#${id}`, { exact: true }) })
}

/** Panel lateral de detalle de garantía (PanelDetalle) — único mientras no haya un modal de selección abierto encima. */
export function panelGarantia(page: Page): Locator {
  return page.locator('div.shadow-2xl')
}

/** Panel lateral de detalle de un pedido (TabListaPedidos) — único mientras esté abierto. */
export function panelPedido(page: Page): Locator {
  return page.locator('div.sticky.top-4')
}

/**
 * Modal de detalle de un apartado (ModalDetalle en Apartados.tsx) — necesario
 * porque comparte clases con ModalNuevoApartado (ambos "rounded-2xl shadow-xl")
 * y la fila de la lista repite el mismo texto de estado que el badge del
 * modal; solo uno de los dos modales está abierto a la vez.
 */
export function panelApartado(page: Page): Locator {
  return page.locator('div.rounded-2xl.shadow-xl')
}

/** Fila de una comisión en ComisionesCard, identificada por un texto distintivo del detalle (venta/equipo/mantenimiento). */
export function filaComision(page: Page, textoDistintivo: string): Locator {
  return page.locator('li').filter({ hasText: textoDistintivo })
}

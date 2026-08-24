import { Page, expect } from '@playwright/test'

/**
 * Cierra un SweetAlert2 de confirmación (sin `timer`, requiere click en OK)
 * como los que usa GarantiasSolicitudes.tsx tras crear/resolver/rechazar.
 */
export async function cerrarSwal(page: Page) {
  const popup = page.locator('.swal2-popup')
  await expect(popup).toBeVisible()
  await page.locator('.swal2-confirm').click()
  await expect(popup).toBeHidden()
}

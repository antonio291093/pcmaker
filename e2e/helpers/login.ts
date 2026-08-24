import { Page, expect } from '@playwright/test'

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  // El login muestra un SweetAlert de "Bienvenido" y luego hace window.location.href
  // hacia /admin, /tecnico o /ventas según el rol — hay que esperar esa navegación completa.
  await page.waitForURL(/\/(admin|tecnico|ventas)(\/|$)/, { timeout: 10_000 })

  // El botón de logout dice "Cerrar sesión" en los sidebars de ventas/técnico,
  // pero "Salir" en el de admin (frontend/src/app/admin/components/Sidebar.tsx).
  await expect(page.getByRole('button', { name: /cerrar sesión|salir/i })).toBeVisible()
}

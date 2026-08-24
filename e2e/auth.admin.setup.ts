import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { loginViaUI } from './helpers/login'

const authFile = path.join(__dirname, '.auth/admin.json')

const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

setup('authenticate as admin', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Faltan las variables de entorno E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. ' +
      'Corre backend/scripts/seedE2EUsers.js y completa e2e/.env (ver e2e/.env.example).'
    )
  }

  await loginViaUI(page, EMAIL, PASSWORD)

  // Primer login de admin sin `sucursal_activa` en localStorage: la app
  // bloquea con SucursalSelectorModal ("Selecciona la sucursal a administrar")
  // hasta elegir una. Se resuelve una sola vez aquí — el valor queda en
  // localStorage y por lo tanto en el storageState que guardan los specs.
  const selectorSucursal = page.getByRole('heading', { name: 'Selecciona la sucursal a administrar' })
  const aparecioSelector = await selectorSucursal
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false)
  if (aparecioSelector) {
    await page.getByRole('heading', { level: 3 }).first().click()
    await expect(selectorSucursal).toBeHidden()
  }

  await page.context().storageState({ path: authFile })
})

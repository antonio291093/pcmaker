import { test as setup } from '@playwright/test'
import path from 'path'
import { loginViaUI } from './helpers/login'

const authFile = path.join(__dirname, '.auth/ventas.json')

// Credenciales del usuario de prueba — nunca hardcodear, siempre por variable de entorno.
const EMAIL = process.env.E2E_USER_EMAIL
const PASSWORD = process.env.E2E_USER_PASSWORD

setup('authenticate as ventas', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Faltan las variables de entorno E2E_USER_EMAIL / E2E_USER_PASSWORD. ' +
      'Corre backend/scripts/seedE2EUsers.js y completa e2e/.env (ver e2e/.env.example).'
    )
  }

  await loginViaUI(page, EMAIL, PASSWORD)
  await page.context().storageState({ path: authFile })
})

import { test as setup } from '@playwright/test'
import path from 'path'
import { loginViaUI } from './helpers/login'

const authFile = path.join(__dirname, '.auth/tecnico.json')

const EMAIL = process.env.E2E_TECNICO_EMAIL
const PASSWORD = process.env.E2E_TECNICO_PASSWORD

setup('authenticate as tecnico', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Faltan las variables de entorno E2E_TECNICO_EMAIL / E2E_TECNICO_PASSWORD. ' +
      'Corre backend/scripts/seedE2EUsers.js y completa e2e/.env (ver e2e/.env.example).'
    )
  }

  await loginViaUI(page, EMAIL, PASSWORD)
  await page.context().storageState({ path: authFile })
})

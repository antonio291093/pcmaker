import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Carga e2e/.env (credenciales del usuario E2E) si existe — en CI las variables
// E2E_USER_EMAIL / E2E_USER_PASSWORD se pueden inyectar directamente en el ambiente.
try {
  process.loadEnvFile(path.resolve(__dirname, 'e2e/.env'))
} catch {
  // e2e/.env no existe — copia e2e/.env.example y complétalo, o exporta las variables manualmente
}

/**
 * Corre contra el ambiente de desarrollo local (npm run dev).
 * Antes de ejecutar los tests, levanta manualmente:
 *   - Backend:  cd backend && npx nodemon src/server.js   (requiere Postgres local arriba)
 *   - Frontend: cd frontend && npm run dev                (http://localhost:3000)
 * No se usa `webServer` porque el ambiente de dev de este proyecto son dos procesos
 * independientes (backend necesita la base de datos ya conectada) — ver CLAUDE.md.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup-ventas', testMatch: /auth\.setup\.ts$/ },
    { name: 'setup-tecnico', testMatch: /auth\.tecnico\.setup\.ts$/ },
    { name: 'setup-admin', testMatch: /auth\.admin\.setup\.ts$/ },

    {
      // Único project que corre specs — la sesión de ventas es la que arranca
      // cada flujo (crea la solicitud de garantía / el pedido); los specs
      // abren sus propios browser.newContext({ storageState }) para técnico/admin.
      name: 'chromium-ventas',
      testMatch: [/garantias\.spec\.ts$/, /pedidos\.spec\.ts$/],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/ventas.json' },
      dependencies: ['setup-ventas', 'setup-tecnico', 'setup-admin'],
    },
    {
      // Sin specs propios: solo existe para que su setup genere el storageState
      // que los specs cargan manualmente. testMatch que no matchea nada evita
      // que Playwright se queje de un project sin tests y evita correr specs 3 veces.
      name: 'chromium-tecnico',
      testMatch: /$^/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/tecnico.json' },
      dependencies: ['setup-tecnico'],
    },
    {
      name: 'chromium-admin',
      testMatch: /$^/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup-admin'],
    },
  ],
})

import { execFileSync } from 'child_process'
import path from 'path'

/**
 * Corre backend/scripts/seedE2EFixtures.js como subproceso antes de toda la
 * suite — deja los fixtures de Garantías/Pedidos en un estado conocido sin
 * importar lo que dejó la corrida anterior. Se ejecuta como proceso aparte
 * (no como require()) para no mezclar su pool de pg / su propio
 * process.exit() con el proceso de Playwright, y para reusar tal cual el
 * mismo script que se puede correr a mano (`cd backend && node
 * scripts/seedE2EFixtures.js`).
 */
export default function globalSetup() {
  execFileSync('node', ['scripts/seedE2EFixtures.js'], {
    cwd: path.resolve(__dirname, '../backend'),
    stdio: 'inherit',
  })
}

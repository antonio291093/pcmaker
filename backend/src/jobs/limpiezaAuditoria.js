const cron = require('node-cron')
const pool = require('../config/db')

// Todos los días a las 3:00 am elimina registros con más de 90 días
cron.schedule('0 3 * * *', async () => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM inventario_auditoria WHERE fecha < NOW() - INTERVAL '90 days'",
    )
    console.log(`[auditoria] Limpieza completada: ${rowCount} registros eliminados`)
  } catch (err) {
    console.error('[auditoria] Error en limpieza automática:', err)
  }
})

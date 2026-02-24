const pool = require('../config/db')

exports.obtenerCatalogo = async () => {

  const result = await pool.query(`
    
    SELECT
      i.id,      
      i.precio,
      '/catalogo-img/' || i.imagen_catalogo
      AS imagen,
      s.nombre AS sucursal

    FROM inventario i

    LEFT JOIN sucursales s
    ON i.sucursal_id = s.id

    WHERE i.visible_catalogo = true
    AND i.imagen_catalogo IS NOT NULL

    ORDER BY i.id

  `)

  return result.rows

}
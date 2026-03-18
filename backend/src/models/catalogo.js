const pool = require('../config/db')

exports.obtenerCatalogo = async ({
  categoria_catalogo_id,
  sucursal_id,
  limit
}) => {

  let query = `

    SELECT
      i.id,
      i.precio,
      '/catalogo-img/' || i.imagen_catalogo AS imagen,
      s.nombre AS sucursal

    FROM inventario i

    LEFT JOIN sucursales s
    ON i.sucursal_id = s.id

    WHERE i.visible_catalogo = true
    AND i.imagen_catalogo IS NOT NULL

  `

  const params = []
  let index = 1

  // 🔹 Filtro categoría
  if (categoria_catalogo_id != null) {

    query += `
      AND i.categoria_catalogo_id = $${index}
    `

    params.push(categoria_catalogo_id)

    index++

  }

  // 🔹 Filtro sucursal
  if (sucursal_id != null) {

    query += `
      AND i.sucursal_id = $${index}
    `

    params.push(sucursal_id)

    index++

  }

  query += `
    ORDER BY i.id DESC
  `

  // 🔹 Límite
  if (limit != null) {

    query += `
      LIMIT $${index}
    `

    params.push(limit)

  }

  const result = await pool.query(query, params)

  return result.rows

}
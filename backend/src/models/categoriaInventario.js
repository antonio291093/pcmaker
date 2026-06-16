const db = require('../config/db')


// Obtener todas las categorías
const getCategorias = async () => {
    const result = await db.query(`
        SELECT id, descripcion
        FROM catalogo_categorias
        ORDER BY descripcion
    `)

    return result.rows
}

// Obtener categoría por id
const getCategoriaById = async (id) => {
    const result = await db.query(`
        SELECT id, descripcion
        FROM catalogo_categorias
        WHERE id = $1
    `,[id])

    return result.rows[0]
}

// Crear categoría
const crearCategoria = async (descripcion) => {

    const result = await db.query(`
        INSERT INTO catalogo_categorias (descripcion)
        VALUES ($1)
        RETURNING *
    `,[descripcion])

    return result.rows[0]
}

// Actualizar categoría
const actualizarCategoria = async (id, descripcion) => {

    const result = await db.query(`
        UPDATE catalogo_categorias
        SET descripcion = $1
        WHERE id = $2
        RETURNING *
    `,[descripcion,id])

    return result.rows[0]
}

// Eliminar categoría
const eliminarCategoria = async (id) => {

    const { rows } = await db.query(
        `SELECT COUNT(*) AS count FROM inventario WHERE categoria_catalogo_id = $1`,
        [id]
    )
    const count = parseInt(rows[0].count)
    if (count > 0) {
        const err = new Error(
            `No puedes eliminar esta categoría porque tiene ${count} producto(s) asignados. Reasígnalos primero.`
        )
        err.statusCode = 409
        throw err
    }

    await db.query(`
        DELETE FROM catalogo_categorias
        WHERE id = $1
    `,[id])

    return true
}

module.exports = {
    getCategorias,
    getCategoriaById,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
}
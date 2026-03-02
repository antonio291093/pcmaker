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
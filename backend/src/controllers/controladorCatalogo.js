const pool = require('../config/db')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const catalogoModel = require('../models/catalogo')

exports.obtenerCatalogo = async (req, res) => {

  try {

    const { categoria_catalogo_id, sucursal_id, limit } = req.query;

    const items = await catalogoModel.obtenerCatalogo({
      categoria_catalogo_id,
      sucursal_id,
      limit
    });

    res.json(items);

  } catch (error) {

    console.error("Error catalogo:", error);

    res.status(500).json({
      message: "Error cargando catálogo"
    });

  }

};

exports.subirImagenCatalogo = async (req, res) => {

  try {

    const inventarioId = req.params.id

    if (!req.file) {
      return res.status(400).json({
        message: "No se envió imagen"
      })
    }

    const rutaOriginal = req.file.path

    const nombreFinal = `inventario_${inventarioId}.webp`

    const rutaFinal = path.join(
      'uploads/catalogo',
      nombreFinal
    )

    // Optimizar imagen
    await sharp(rutaOriginal)
      .resize(800)
      .webp({ quality: 80 })
      .toFile(rutaFinal)

    fs.unlinkSync(rutaOriginal)

    // Guardar en DB
    await pool.query(`
      UPDATE inventario
      SET imagen_catalogo = $1,
          visible_catalogo = true
      WHERE id = $2
    `, [nombreFinal, inventarioId])


    res.json({
      message: "Imagen subida correctamente",
      imagen: nombreFinal
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: "Error al subir imagen"
    })

  }

}
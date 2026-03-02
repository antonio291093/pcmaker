const categoriasModel = require('../models/categoriaInventario')

// Obtener todas
const getCategorias = async (req,res) => {

    try{

        const categorias = await categoriasModel.getCategorias()

        res.json(categorias)

    }catch(error){

        console.error(error)
        res.status(500).json({message:"Error obteniendo categorias"})

    }
}

// Obtener por id
const getCategoria = async (req,res) => {

    try{

        const {id} = req.params

        const categoria = await categoriasModel.getCategoriaById(id)

        res.json(categoria)

    }catch(error){

        console.error(error)
        res.status(500).json({message:"Error obteniendo categoria"})

    }
}

// Crear
const crearCategoria = async (req,res) => {

    try{

        const {descripcion} = req.body

        const categoria = await categoriasModel.crearCategoria(descripcion)

        res.json(categoria)

    }catch(error){

        console.error(error)
        res.status(500).json({message:"Error creando categoria"})

    }
}

// Actualizar
const actualizarCategoria = async (req,res) => {

    try{

        const {id} = req.params
        const {descripcion} = req.body

        const categoria = await categoriasModel.actualizarCategoria(id,descripcion)

        res.json(categoria)

    }catch(error){

        console.error(error)
        res.status(500).json({message:"Error actualizando categoria"})

    }
}

// Eliminar
const eliminarCategoria = async (req,res) => {

    try{

        const {id} = req.params

        await categoriasModel.eliminarCategoria(id)

        res.json({message:"Categoria eliminada"})

    }catch(error){

        console.error(error)
        res.status(500).json({message:"Error eliminando categoria"})

    }
}

module.exports = {

    getCategorias,
    getCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria

}
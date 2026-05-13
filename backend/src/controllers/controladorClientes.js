const {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
} = require("../models/clientes");

exports.listar = async (req, res) => {
  try {
    const sucursal_id = Number(req.query.sucursal_id) || null;
    const busqueda = req.query.busqueda?.trim() || null;
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const por_pagina = Math.min(100, Math.max(1, Number(req.query.por_pagina) || 25));

    const data = await obtenerClientes({ sucursal_id, busqueda, pagina, por_pagina });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener clientes" });
  }
};

exports.obtenerUno = async (req, res) => {
  try {
    const cliente = await obtenerClientePorId(Number(req.params.id));

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener cliente" });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, telefono, correo, sucursal_id } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const cliente = await crearCliente({
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      sucursal_id: sucursal_id || null,
    });

    res.status(201).json(cliente);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un cliente con ese teléfono" });
    }
    console.error(error);
    res.status(500).json({ message: "Error al crear cliente" });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { nombre, telefono, correo, sucursal_id } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const cliente = await actualizarCliente(Number(req.params.id), {
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      sucursal_id: sucursal_id || null,
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un cliente con ese teléfono" });
    }
    console.error(error);
    res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/controladorPedidos');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, pedidosController.crearPedido);

module.exports = router;

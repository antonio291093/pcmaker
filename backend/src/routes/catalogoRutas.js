const express = require('express')
const router = express.Router()

const upload = require('../middlewares/uploadCatalogo')
const catalogoController = require('../controllers/controladorCatalogo')
const authMiddleware = require('../middlewares/authMiddleware')

router.post(
  "/imagen/:id",
  authMiddleware,
  upload.single("imagen"),
  catalogoController.subirImagenCatalogo
)

router.get(
  "/",
  catalogoController.obtenerCatalogo
)

module.exports = router
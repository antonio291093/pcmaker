const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/catalogo')
  },
  filename: (req, file, cb) => {

    const inventarioId = req.params.id

    const ext = path.extname(file.originalname)

    cb(null, `inventario_${inventarioId}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {

  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/webp'
  ) {
    cb(null, true)
  } else {
    cb(new Error('Formato no permitido'), false)
  }
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024
  }
})
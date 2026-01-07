const bwipjs = require('bwip-js');

/**
 * Genera un código de barras CODE128 en PNG base64
 * @param {string} texto
 * @returns {Promise<string>} base64 PNG
 */
async function generarBarcodeBase64(texto) {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: texto,
    scale: 3,
    height: 12,
    includetext: false,
  });

  return `data:image/png;base64,${png.toString('base64')}`;
}

module.exports = {
  generarBarcodeBase64,
};

'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import EtiquetaA4PDF from './EtiquetaA4PDF';

interface Props {
  open: boolean;
  onClose: () => void;
  etiquetas: any[];
}

export default function EtiquetaA4Modal({ open, onClose, etiquetas }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4">
          Imprimir etiquetas
        </h2>

        <PDFDownloadLink
          document={<EtiquetaA4PDF etiquetas={etiquetas} />}
          fileName="etiquetas-lote.pdf"
        >
          {({ loading }) => (
            <button
              className="w-full bg-green-600 text-white py-2 rounded-md"
            >
              {loading ? 'Generando PDF...' : 'Descargar etiquetas A4'}
            </button>
          )}
        </PDFDownloadLink>

        <button
          onClick={onClose}
          className="w-full mt-3 text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import EtiquetaA4PDF from './EtiquetaA4PDF';
import EtiquetaTermicaPDF from './EtiquetaTermicaPDF';
import type { Etiqueta } from './Types';
import { useState, useMemo } from 'react';

interface Props {
  open: boolean;
  etiquetas: Etiqueta[];
  onClose: () => void;
  allowCantidad?: boolean;
}

export default function EtiquetaA4Modal({
  open,
  etiquetas,
  onClose,
  allowCantidad = false,
}: Props) {

  // ✅ Hooks SIEMPRE arriba
  const [cantidadInput, setCantidadInput] = useState('1');

  const cantidad = Math.max(1, parseInt(cantidadInput, 10) || 1);

  const etiquetasFinales = useMemo(() => {
    return allowCantidad
      ? etiquetas.flatMap((e) =>
          Array.from({ length: cantidad }, () => e)
        )
      : etiquetas;
  }, [allowCantidad, etiquetas, cantidad]);

  const cerrar = () => {
    if (allowCantidad) setCantidadInput('1');
    onClose();
  };

  const puedeImprimir = etiquetasFinales.length > 0;

  // ✅ return condicional DESPUÉS de hooks
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[380px]">
        <h2 className="text-lg font-semibold mb-4 text-center">
          Selecciona formato de impresión
        </h2>

        {allowCantidad && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
              Cantidad de etiquetas
            </label>
            <input
              type="number"
              min={1}
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
              onBlur={() => {
                if (!cantidadInput || Number(cantidadInput) < 1) {
                  setCantidadInput('1');
                }
              }}
              className="w-full border rounded-md px-3 py-2 text-center"
            />
          </div>
        )}

        <PDFDownloadLink
          document={<EtiquetaA4PDF etiquetas={etiquetasFinales} />}
          fileName="etiquetas-a4.pdf"
        >
          {({ loading }) => (
            <button
              className="w-full bg-indigo-600 text-white py-2 rounded-md mb-3"
              disabled={loading || !puedeImprimir}
            >
              {loading ? 'Generando A4…' : 'A4 – Impresora normal'}
            </button>
          )}
        </PDFDownloadLink>

        <PDFDownloadLink
          document={<EtiquetaTermicaPDF etiquetas={etiquetasFinales} />}
          fileName="etiquetas-termica.pdf"
        >
          {({ loading }) => (
            <button
              className="w-full bg-green-600 text-white py-2 rounded-md"
              disabled={loading || !puedeImprimir}
            >
              {loading ? 'Generando térmica…' : 'Etiqueta térmica – Ribtec'}
            </button>
          )}
        </PDFDownloadLink>

        <button
          onClick={cerrar}
          className="w-full mt-4 text-gray-600 hover:text-gray-800"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

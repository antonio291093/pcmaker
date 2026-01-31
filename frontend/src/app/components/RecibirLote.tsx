'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { useUser } from '@/context/UserContext'
import EtiquetaA4Modal from './EtiquetaA4Modal';
import type { EtiquetaDraft, Etiqueta } from './Types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function getLoteLabel() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `LOTE ${yyyy}${mm}${dd}-${hh}${mi}`;
}

function generarIdFechaConsecutivo(i: number) {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${i}`
}

export default function RecibirLote() {
  const [equipos, setEquipos] = useState<number>(1)
  const [loteActual, setLoteActual] = useState<number>(1)
  const [etiquetasDraft, setEtiquetasDraft] = useState<EtiquetaDraft[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(false)
  const [usuarioId, setUsuarioId] = useState<number | null>(null)     
  const { user, loading: userLoading } = useUser()  
  const [showPrintModal, setShowPrintModal] = useState(false);


  useEffect(() => {
    if (userLoading) return
    if (!user) return

    setUsuarioId(user.id)
  }, [user, userLoading])

  if (userLoading) return null
  if (!user) return null

  const onChangeEquipos = (value: number) => {
    if (value < 1 || isNaN(value)) {
      Swal.fire('Error', 'Por favor ingresa un número válido mayor a cero', 'error')
      return
    }
    setEquipos(value)
  }

  const handleGenerar = async () => {
    if (equipos < 1) {
      Swal.fire('Error', 'Debes ingresar al menos 1 equipo para generar etiquetas', 'warning')
      return
    }

    const lote = getLoteLabel();
    const nuevasEtiquetas: EtiquetaDraft[] = [];
    for (let numSerie = 1; numSerie <= equipos; numSerie++) {
      nuevasEtiquetas.push({
        lote,
        id: generarIdFechaConsecutivo(numSerie), // Formato basado en fecha + consecutivo
      });
    }
    setEtiquetasDraft(nuevasEtiquetas)
  }

  const handleImprimir = async () => {
    if (etiquetasDraft.length === 0) {
      Swal.fire('Error', 'Primero genera las etiquetas', 'warning');
      return;
    }

    if (!usuarioId) {
      Swal.fire('Error', 'No se pudo obtener la información del usuario', 'error');
      return;
    }

    setLoading(true);

    try {
      const confirm = await Swal.fire({
        title: 'Confirmar acción',
        text: 'Se guardarán las etiquetas generadas como un nuevo lote. ¿Deseas continuar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
      });

      if (!confirm.isConfirmed) return;

      const lote = etiquetasDraft[0].lote;
      const fechaRecibo = new Date().toISOString();
      const totalEquipos = etiquetasDraft.length;

      const response = await fetch(`${API_URL}/api/lotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          etiqueta: lote,
          fecha_recibo: fechaRecibo,
          total_equipos: totalEquipos,
          usuario_recibio: usuarioId,
          fecha_creacion: fechaRecibo,          
        }),
      });

      if (!response.ok) throw new Error('Error al guardar el lote');

      const data = await response.json();      

      // 👇 estas ya vienen listas para el PDF
      setEtiquetas(
        data.etiquetas.map((e: any) => ({
          lote: data.lote.etiqueta,
          id: e.serie,
          barcode: e.barcode,
        }))
      );

      Swal.fire({
        icon: 'success',
        title: 'Lote guardado',
        html: `Se guardaron <b>${totalEquipos}</b> etiquetas del <b>${lote}</b>.`,
        timer: 2000,
        showConfirmButton: false,
      });

      setShowPrintModal(true);    
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error en el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };


  const cantidadEtiquetas = etiquetasDraft.length
  const primera = cantidadEtiquetas > 0 ? etiquetasDraft[0] : null
  const ultima = cantidadEtiquetas > 1 ? etiquetasDraft[cantidadEtiquetas - 1] : primera

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 max-w-full sm:max-w-6xl w-full"
    >
      <h2 className="text-xl font-semibold mb-6 text-gray-700 text-center sm:text-left">Recibir lote</h2>
      <div className="flex flex-col gap-4 mb-4">
        <label className="font-medium text-gray-600">¿Cuántos equipos se recibieron?</label>
        <input
          type="number"
          min={1}
          max={100}
          value={equipos}
          onChange={e => onChangeEquipos(Number(e.target.value))}
          className="border rounded-md p-2 w-32 input-minimal"
          disabled={loading}
        />
        <button
          onClick={handleGenerar}
          className="bg-indigo-600 text-white rounded-md py-2 w-40 font-medium hover:bg-indigo-700 transition-colors"
          disabled={loading}
        >
          Generar etiquetas
        </button>
      </div>

      {cantidadEtiquetas > 0 && (
        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold mb-3">Primer y último número de serie generados</h3>
          <div className="flex flex-wrap justify-center gap-8 mb-4">
            {primera && (
              <div className="rounded border p-3 text-center bg-gray-50 shadow-sm min-w-[180px] max-w-[220px] mx-auto">
                <div className="font-bold text-indigo-700">{primera.lote}</div>
                <div className="text-sm mt-1 text-gray-700">{primera.id}</div>
                <div className="text-xs text-gray-500 mt-1">Primero</div>
              </div>
            )}
            {ultima && cantidadEtiquetas > 1 && (
              <div className="rounded border p-3 text-center bg-gray-50 shadow-sm min-w-[180px] max-w-[220px] mx-auto">
                <div className="font-bold text-indigo-700">{ultima.lote}</div>
                <div className="text-sm mt-1 text-gray-700">{ultima.id}</div>
                <div className="text-xs text-gray-500 mt-1">Último</div>
              </div>
            )}
          </div>
          <div className="text-gray-600 mt-2 text-sm">
            Se generaron <span className="font-bold">{cantidadEtiquetas}</span> etiquetas del {primera?.lote}.
            <br />
            Mostrando el primer y último número de serie de la serie generada.
          </div>
          <button
            onClick={handleImprimir}
            disabled={loading}
            className="mt-4 bg-green-600 text-white rounded-md py-2 px-8 font-medium hover:bg-green-700 transition-colors"
          >
            {loading ? "Guardando..." : "Imprimir etiquetas"}
          </button>

          <EtiquetaA4Modal
            open={showPrintModal}
            etiquetas={etiquetas}
            onClose={() => {
              setShowPrintModal(false);
              setEquipos(1);
              setEtiquetas([]);
              setEtiquetasDraft([]);
              setLoteActual(loteActual + 1);
            }}
          />

        </div>
      )}
    </motion.div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Swal from 'sweetalert2'
import {
  FaMoneyBillWave,
  FaShoppingCart,
  FaArrowDown,
  FaArrowUp,
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaPlus,
  FaListUl
} from 'react-icons/fa'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function CorteCajaSection() {
  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [ventas, setVentas] = useState(0)
  const [gastos, setGastos] = useState(0)
  const [ingresos, setIngresos] = useState(0)
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [tipoMovimiento, setTipoMovimiento] = useState('gasto')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')  
  const balance = ventas + ingresos - gastos    
  const [fechaCortePendiente, setFechaCortePendiente] = useState<string | null>(null)
  const { user, loading: userLoading } = useUser()

  const formatDate = (fechaISO: string) => {
    const [year, month, day] = fechaISO.split('-')
    return `${day} de ${meses[Number(month) - 1]} de ${year}`
  }

  const meses = [
    'enero', 'febrero', 'marzo', 'abril',
    'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]


  if (userLoading) return <p>Cargando corte de caja...</p>
  if (!user) return null  
  
  useEffect(() => {
    if (!user) return    
    setUsuarioId(user.id)
    setSucursalId(user.sucursal_id)    
    obtenerResumen(user.sucursal_id)
    obtenerCortes(user.sucursal_id)    
    verificarCortePendiente(user.sucursal_id)
    abrirDia(user.sucursal_id)
  }, [user])

  const verificarCortePendiente = async (sucursal_id: number) => {
    try {
      const resp = await fetch(
        `${API_URL}/api/caja/corte-pendiente?sucursal_id=${sucursal_id}`,
        { credentials: 'include' }
      )

      if (!resp.ok) return

      const data = await resp.json()

      if (data.requiere_corte && data.fecha_pendiente) {
        // Normalizar a YYYY-MM-DD
        const fechaISO = String(data.fecha_pendiente).split('T')[0]

        setFechaCortePendiente(fechaISO)

        const [year, month, day] = fechaISO.split('-')
        const fechaFormateada = `${day}/${month}/${year}`

        Swal.fire({
          icon: 'warning',
          title: 'Corte pendiente',
          text: `Tienes un corte pendiente del día ${fechaFormateada}`,
          confirmButtonColor: '#16A34A'
        })
      } else {
        setFechaCortePendiente(null)
      }
    } catch (err) {
      console.error('Error verificando corte pendiente:', err)
    }
  }

  const abrirDia = async (sucursal_id: number) => {
    try {
      await fetch(`${API_URL}/api/caja/abrir-dia`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursal_id })
      })
    } catch (err) {
      console.error('Error al abrir día operativo', err)
    }
  }
  
  const obtenerResumen = async (sucursal_id: number | null) => {
    try {
      const fecha = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      const resp = await fetch(
        `${API_URL}/api/caja/resumen?sucursal_id=${sucursal_id}&fecha=${fecha}`,
        { credentials: 'include' }
      )

      if (!resp.ok) {
        console.error('Error HTTP:', resp.status)
        return
      }

      const data = await resp.json()
      setVentas(Number(data.total_ventas) || 0)
      setGastos(Number(data.total_gastos) || 0)
      setIngresos(Number(data.total_ingresos) || 0)
    } catch (err) {
      console.error('Error cargando resumen de caja:', err)
    }
  }

  const registrarMovimiento = async () => {
    if (!monto || !tipoMovimiento || !usuarioId || !sucursalId) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor completa todos los campos antes de registrar el movimiento.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }

    try {
      const resp = await fetch(`${API_URL}/api/caja/movimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tipo: tipoMovimiento,
          monto: parseFloat(monto),
          descripcion,
          sucursal_id: sucursalId
        })
      })

      const data = await resp.json()

      // 🟢 ÉXITO
      if (resp.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Movimiento registrado',
          text: 'El movimiento fue guardado correctamente.',
          confirmButtonColor: '#4F46E5'
        })

        setMonto('')
        setDescripcion('')
        obtenerResumen(sucursalId)
        obtenerCortes(sucursalId)
        return
      }

      // 🔒 BLOQUEO POR DÍA PENDIENTE
      if (resp.status === 423) {
        Swal.fire({
          icon: 'warning',
          title: 'Día pendiente por cerrar',
          text: data.fecha_pendiente
            ? `Debes cerrar el día ${formatDate(data.fecha_pendiente)} antes de continuar.`
            : data.message || 'Debes cerrar el día anterior antes de continuar.',
          confirmButtonColor: '#16A34A'
        })
        return
      }

      // 🔴 OTRO ERROR CONTROLADO
      Swal.fire({
        icon: 'error',
        title: 'No se pudo registrar',
        text: data.message || 'Ocurrió un error al registrar el movimiento.',
        confirmButtonColor: '#DC2626'
      })
    } catch (err) {
      console.error('Error registrando movimiento:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'No se pudo registrar el movimiento.',
        confirmButtonColor: '#DC2626'
      })
    }
  }

  const generarCorte = async () => {
    const confirm = await Swal.fire({
      title: '¿Generar corte de caja?',
      text: fechaCortePendiente
        ? `Se cerrará el día ${formatDate(fechaCortePendiente)}.`
        : 'Se cerrará el día operativo correspondiente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16A34A',
      cancelButtonColor: '#DC2626',
      confirmButtonText: 'Sí, cerrar día'
    })

    if (!confirm.isConfirmed) return

    try {
      
      const resp = await fetch(
        `${API_URL}/api/caja/corte?sucursal_id=${sucursalId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fecha: fechaCortePendiente
          })
        }
      )

      const data = await resp.json()

      // 🟢 ÉXITO
      if (resp.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Corte realizado',
          text: `Se cerró el día ${formatDate(data.fecha)}${
            data.sin_movimientos ? ' (sin movimientos)' : ''
          }`,
          confirmButtonColor: '#16A34A'
        })
        
        obtenerResumen(sucursalId)
        obtenerCortes(sucursalId)
        return
      }

      // 🔴 ERROR CONTROLADO
      Swal.fire({
        icon: 'error',
        title: 'No se pudo cerrar el día',
        text: data.message || 'Ocurrió un error al generar el corte.',
        confirmButtonColor: '#DC2626'
      })
    } catch (err) {
      console.error('Error generando corte:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Hubo un problema al cerrar el día.',
        confirmButtonColor: '#DC2626'
      })
    }
  }

  // 🔹 Obtener historial de cortes
  const obtenerCortes = async (sucursal_id: number | null) => {
    try {
      const resp = await fetch(`${API_URL}/api/caja/cortes`, { credentials: 'include' })
      if (!resp.ok) return
      const data = await resp.json()
      setMovimientos(data)
    } catch (err) {
      console.error('Error al cargar cortes:', err)
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <FaFileInvoiceDollar className="text-indigo-600" /> Corte de Caja
      </h2>

      {/* === Resumen de totales === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm flex flex-col items-start">
          <FaShoppingCart className="text-green-600 text-3xl mb-2" />
          <p className="text-gray-600 text-sm">Total Ventas</p>
          <h3 className="text-2xl font-semibold text-green-700">${ventas.toFixed(2)}</h3>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm flex flex-col items-start">
          <FaArrowDown className="text-red-600 text-3xl mb-2" />
          <p className="text-gray-600 text-sm">Total Gastos</p>
          <h3 className="text-2xl font-semibold text-red-700">${gastos.toFixed(2)}</h3>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm flex flex-col items-start">
          <FaArrowUp className="text-blue-600 text-3xl mb-2" />
          <p className="text-gray-600 text-sm">Ingresos Extra</p>
          <h3 className="text-2xl font-semibold text-blue-700">${ingresos.toFixed(2)}</h3>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm flex flex-col items-start">
          <FaBalanceScale className={`text-3xl mb-2 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`} />
          <p className="text-gray-600 text-sm">Balance Final</p>
          <h3
            className={`text-2xl font-bold ${
              balance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            ${balance.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* === Formulario nuevo movimiento === */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaPlus className="text-indigo-600" /> Registrar movimiento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="border rounded-lg px-3 py-2"
            value={tipoMovimiento}
            onChange={e => setTipoMovimiento(e.target.value)}
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
            <option value="venta">Venta manual</option>
          </select>
          <input
            type="number"
            placeholder="Monto"
            className="border rounded-lg px-3 py-2"
            value={monto}
            onChange={e => setMonto(e.target.value)}
          />
          <input
            type="text"
            placeholder="Descripción"
            className="border rounded-lg px-3 py-2"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
          <button
            onClick={registrarMovimiento}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Registrar
          </button>
        </div>
      </div>

      {/* === Historial de cortes === */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FaListUl className="text-indigo-600" /> Historial de cortes
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="py-2 px-4 text-left">Fecha</th>
                <th className="py-2 px-4 text-left">Ventas</th>
                <th className="py-2 px-4 text-left">Gastos</th>
                <th className="py-2 px-4 text-left">Ingresos</th>
                <th className="py-2 px-4 text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-3 text-gray-500">
                    No hay cortes registrados
                  </td>
                </tr>
              )}
              {movimientos.map((m, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{new Date(m.fecha).toLocaleDateString()}</td>
                  <td className="py-2 px-4 text-green-700">${m.total_ventas}</td>
                  <td className="py-2 px-4 text-red-700">${m.total_gastos}</td>
                  <td className="py-2 px-4 text-blue-700">${m.total_ingresos}</td>
                  <td
                    className={`py-2 px-4 font-semibold ${
                      m.balance_final >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    ${m.balance_final}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Botón generar corte === */}
      <button
        onClick={generarCorte}
        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 w-full rounded-xl shadow transition mt-8"
      >
        <FaMoneyBillWave /> Generar Corte de Caja
      </button>
    </div>
  )
}

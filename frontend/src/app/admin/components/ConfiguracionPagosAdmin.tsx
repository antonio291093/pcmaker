'use client'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function ConfiguracionPagosAdmin() {
  const [configs, setConfigs] = useState<any[]>([])
  const [form, setForm] = useState<any>({
    tipo_pago: 'TRANSFERENCIA',
    requiere_factura: false,
    banco: '',
    titular: '',
    numero_cuenta: '',
    clabe: '',
    referencia: '',
    descripcion: '',
    activo: true
  })

  const [editando, setEditando] = useState(false)

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/configuracionPagos`, {
        credentials: 'include'
      })

      const data = await res.json()

      if (!res.ok) throw new Error()

      setConfigs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setConfigs([])
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // 🔹 VALIDACIÓN
  const validar = () => {
    if (!form.descripcion.trim()) return 'La descripción es obligatoria'
    if (!form.banco.trim()) return 'El banco es obligatorio'
    if (!form.titular.trim()) return 'El titular es obligatorio'

    // Validación opcional para transferencia
    if (form.tipo_pago === 'TRANSFERENCIA') {
      if (!form.clabe.trim()) return 'La CLABE es obligatoria'
      if (form.clabe.length !== 18) return 'La CLABE debe tener 18 dígitos'
    }

    return null
  }

  // 🔹 Guardar
  const guardar = async () => {
    const error = validar()

    if (error) {
      Swal.fire('Error', error, 'error')
      return
    }

    const confirm = await Swal.fire({
      title: editando ? '¿Actualizar?' : '¿Crear?',
      text: 'Confirma la operación',
      icon: 'question',
      showCancelButton: true
    })

    if (!confirm.isConfirmed) return

    const method = editando ? 'PUT' : 'POST'
    const url = editando
      ? `${API_URL}/api/configuracionPagos/${form.id}`
      : `${API_URL}/api/configuracionPagos`

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form)
    })

    Swal.fire('Éxito', 'Guardado correctamente', 'success')

    resetForm()
    fetchConfigs()
  }

  const editar = (c: any) => {
    setForm(c)
    setEditando(true)
  }

  // 🔥 DELETE REAL
  const eliminar = async (id: number) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true
    })

    if (!confirm.isConfirmed) return

    await fetch(`${API_URL}/api/configuracionPagos/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    Swal.fire('Eliminado', 'Registro eliminado correctamente', 'success')
    fetchConfigs()
  }

  // 🔹 Toggle activo
  const toggleActivo = async (config: any) => {
    await fetch(`${API_URL}/api/configuracionPagos/${config.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...config,
        activo: !config.activo
      })
    })

    fetchConfigs()
  }

  const resetForm = () => {
    setForm({
      tipo_pago: 'TRANSFERENCIA',
      requiere_factura: false,
      banco: '',
      titular: '',
      numero_cuenta: '',
      clabe: '',
      referencia: '',
      descripcion: '',
      activo: true
    })
    setEditando(false)
  }

  return (
    <div className="p-6 max-w-3xl">      
      <h3 className="text-xl font-semibold text-gray-700">
        Configuración de transferencia
      </h3>

      {/* FORM */}
      <div className="bg-white p-4 rounded shadow mb-6 space-y-2">

        <input
          placeholder="Descripción"
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <select
          value={form.tipo_pago}
          onChange={e => setForm({ ...form, tipo_pago: e.target.value })}
          className="border p-2 w-full input-minimal"
        >
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>          
        </select>

        <label className="flex gap-2 input-minimal">
          <input
            type="checkbox"
            checked={form.requiere_factura}
            onChange={e =>
              setForm({ ...form, requiere_factura: e.target.checked })
            }
          />
          Requiere factura
        </label>

        <input placeholder="Banco" value={form.banco}
          onChange={e => setForm({ ...form, banco: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <input placeholder="Titular" value={form.titular}
          onChange={e => setForm({ ...form, titular: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <input placeholder="Cuenta" value={form.numero_cuenta}
          onChange={e => setForm({ ...form, numero_cuenta: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <input placeholder="CLABE" value={form.clabe}
          onChange={e => setForm({ ...form, clabe: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <input placeholder="Referencia" value={form.referencia}
          onChange={e => setForm({ ...form, referencia: e.target.value })}
          className="border p-2 w-full input-minimal"
        />

        <button
          onClick={guardar}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {editando ? 'Actualizar' : 'Crear'}
        </button>

        {editando && (
          <button
            onClick={resetForm}
            className="ml-2 text-sm text-gray-500"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* LISTA */}
      {configs.map(c => (
        <div key={c.id} className="border p-3 rounded mb-2 input-minimal">

          <div className="flex justify-between items-center">
            <p className="font-bold">{c.descripcion}</p>

            {/* SWITCH */}
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={c.activo}
                onChange={() => toggleActivo(c)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition ${
                c.activo ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                  c.activo ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          <p className="text-sm">{c.banco} - {c.titular}</p>
          <p className="text-sm">
            {c.tipo_pago} | Factura: {c.requiere_factura ? 'Sí' : 'No'}
          </p>

          <div className="mt-2">
            <button
              onClick={() => editar(c)}
              className="mr-2 text-blue-600"
            >
              Editar
            </button>

            <button
              onClick={() => eliminar(c.id)}
              className="text-red-600"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
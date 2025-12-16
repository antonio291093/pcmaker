'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

type User = { id: number; nombre: string; email: string; rol_id: number; activo: boolean; sucursal_id?: number }
type Sucursal = { id: number; nombre: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const rolNombre = (rol_id: number) =>
  rol_id === 1 ? "Administrador" : rol_id === 2 ? "Técnico" : "Ventas";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [form, setForm] = useState<Omit<User, "id"> & { password?: string }>({
    nombre: "",
    email: "",
    password: "",
    rol_id: 2,
    activo: true,
    sucursal_id: undefined,
  })
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/usuarios/`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUsers(data))
      .catch(() => {
        setUsers([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los usuarios',
        });
      });
  }, []);

  // Cargar sucursales al iniciar
  useEffect(() => {
    fetch(`${API_URL}/api/sucursales`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setSucursales(data))
      .catch(() => {
        setSucursales([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar las sucursales',
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editId
      ? `${API_URL}/api/usuarios/${editId}`
      : `${API_URL}/api/usuarios/`;

    const method = editId ? "PUT" : "POST";
    const body = { ...form };
    if (method === "PUT" && !body.password) delete body.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const user = await res.json();

      if (res.ok) {
        if (editId) {
          setUsers(users.map(u => u.id === editId ? user : u));
          Swal.fire({ icon: 'success', title: 'Usuario actualizado', timer: 1200, showConfirmButton: false });
        } else {
          setUsers([...users, user]);
          Swal.fire({ icon: 'success', title: 'Usuario creado', timer: 1200, showConfirmButton: false });
        }
        setForm({ nombre: "", email: "", password: "", rol_id: 2, activo: true });
        setEditId(null);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: user.message || 'No se pudo guardar el usuario'
        });
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión al servidor' });
    }
  };

  const handleEdit = (user: User) => {
    setForm({ ...user, password: "" });
    setEditId(user.id);
    Swal.fire({
      icon: 'info',
      title: 'Modo edición',
      text: `Editando a ${user.nombre}`,
      timer: 1100,
      showConfirmButton: false,
    });
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (confirm.isConfirmed) {
      const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        Swal.fire({ icon: 'success', title: 'Usuario eliminado', timer: 1200, showConfirmButton: false });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el usuario' });
      }
    }
  };

  const toggleActive = async (id: number, activo: boolean) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...user, activo: !activo })
    })
    if (res.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, activo: !activo } : u));
      Swal.fire({
        icon: 'success',
        title: `Usuario ${!activo ? 'activado' : 'desactivado'}`,
        timer: 1000,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cambiar el estado' });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="bg-white rounded-xl shadow p-4 sm:p-6 max-w-full sm:max-w-6xl w-full"
    >
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-700 text-center sm:text-left">
        Gestión de Usuarios y Roles
      </h2>

      {/* Formulario responsive */}
      <form
        className="mb-6 flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          required
          placeholder="Nombre"
          className="border px-3 py-2 rounded w-full sm:w-36 text-sm"
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        />
        <input
          type="email"
          required
          placeholder="Email"
          className="border px-3 py-2 rounded w-full sm:w-44 text-sm"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <select
          required
          className="border px-3 py-2 rounded w-full sm:w-auto text-sm"
          value={form.rol_id}
          onChange={e => setForm(f => ({ ...f, rol_id: Number(e.target.value) }))}
        >
          <option value={1}>Administrador</option>
          <option value={2}>Técnico</option>
          <option value={3}>Ventas</option>
        </select>        
        <select
          required
          className="border px-3 py-2 rounded w-full sm:w-auto text-sm"
          value={form.sucursal_id ?? ""}
          onChange={e => setForm(f => ({ ...f, sucursal_id: Number(e.target.value) }))}
        >
          <option value="">Seleccionar sucursal</option>
          {sucursales.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <input
          type="password"
          placeholder="Contraseña"
          className="border px-3 py-2 rounded w-full sm:w-36 text-sm"
          value={form.password ?? ""}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
        <button className="bg-indigo-600 text-white rounded px-4 py-2 text-sm hover:bg-indigo-500 w-full sm:w-auto">
          {editId ? "Actualizar" : "Crear"}
        </button>
        {editId && (
          <button
            type="button"
            onClick={() => { setForm({ nombre: "", email: "", password: "", rol_id: 2, activo: true }); setEditId(null) }}
            className="rounded px-3 py-2 ml-0 sm:ml-2 text-xs bg-gray-300 text-gray-800 w-full sm:w-auto"
          >
            Cancelar
          </button>
        )}
      </form>

      {/* Tabla responsive */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-xs sm:text-sm">
  <thead>
    <tr>
      <th className="p-2 sm:p-3 border-b text-left font-medium text-gray-600">Nombre</th>
      <th className="p-2 sm:p-3 border-b text-left font-medium text-gray-600 w-[45%]">Email</th>
      <th className="p-2 sm:p-3 border-b text-left font-medium text-gray-600">Rol</th>
      <th className="p-2 sm:p-3 border-b text-left font-medium text-gray-600">Sucursal</th>
      <th className="p-2 sm:p-3 border-b text-center font-medium text-gray-600">Activo</th>
      <th className="p-2 sm:p-3 border-b"></th>
      <th className="p-2 sm:p-3 border-b"></th>
    </tr>
  </thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
        <td className="p-2 sm:p-3">{user.nombre}</td>
        <td className="p-2 sm:p-3 w-[45%] break-words">{user.email}</td>
        <td className="p-2 sm:p-3">{rolNombre(user.rol_id)}</td>
        <td className="p-2 sm:p-3">
          {sucursales.find(s => s.id === user.sucursal_id)?.nombre || '—'}
        </td>
        <td className="p-2 sm:p-3 text-center">
          <button
            onClick={() => toggleActive(user.id, user.activo)}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              user.activo ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
            }`}
          >
            {user.activo ? 'Sí' : 'No'}
          </button>
        </td>
        <td className="p-2 sm:p-3 text-center">
          <button
            className="text-indigo-600 hover:underline text-xs sm:text-sm"
            onClick={() => handleEdit(user)}
          >
            Editar
          </button>
        </td>
        <td className="p-2 sm:p-3 text-center">
          <button
            className="text-red-600 ml-0 sm:ml-2 hover:underline text-xs sm:text-sm"
            onClick={() => handleDelete(user.id)}
          >
            Eliminar
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

      </div>
    </motion.div>
  )
}

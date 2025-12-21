'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useUser } from '@/context/UserContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');  
  const { user, loading: userLoading } = useUser()
  const router = useRouter();

  useEffect(() => {
    if (userLoading) return

    if (user) {
      let ruta = '/login'

      if (user.rol_id === 1) ruta = '/admin'
      else if (user.rol_id === 2) ruta = '/tecnico'
      else if (user.rol_id === 3) ruta = '/ventas'

      Swal.fire({
        icon: 'success',
        title: 'Ya estás logueado',
        timer: 1000,
        showConfirmButton: false
      }).then(() => {
        router.replace(ruta)
      })
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Error de autenticación',
        });
        return;
      }

      localStorage.setItem('email', data.user.email);
      
      const { rol_id } = data.user;
      let ruta = ''; 
      if (rol_id === 1) ruta = '/admin';
      else if (rol_id === 2) ruta = '/tecnico';
      else if (rol_id === 3) ruta = '/ventas';

      // ✅ window.location.href = SIEMPRE funciona
      Swal.fire({
        icon: 'success',
        title: 'Bienvenido',
        text: `Has iniciado sesión como ${data.user.email}`,
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = ruta;  // ✅ Fuerza navegación completa
      });

    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg flex flex-col items-center">
        <img src="/pcmaker.png" alt="Logo del Negocio" className="w-52 h-52 mb-6 object-contain" />        
        <form className="w-full" onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
              className="block w-full px-4 py-3 rounded-md border border-gray-200 focus:border-indigo-500 outline-none text-gray-700"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-5">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="block w-full px-4 py-3 rounded-md border border-gray-200 focus:border-indigo-500 outline-none text-gray-700"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-indigo-500 hover:bg-indigo-600 rounded-md text-white font-semibold transition-colors"
          >
            Iniciar sesión
          </button>
        </form>
        <a href="#" className="mt-6 text-indigo-500 hover:underline text-sm">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  );
}

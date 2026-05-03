'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type User = {
  id: number
  rol_id: number
  sucursal_id: number
  nombre: string
}

type UserContextType = {
  user: User | null
  loading: boolean
  sucursalActiva: number | null
  setSucursalActiva: (id: number | null) => void
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  sucursalActiva: null,
  setSucursalActiva: () => {},
  logout: async () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sucursalActiva, setSucursalActivaState] = useState<number | null>(null)

  // 🔐 Cargar usuario
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/me`, {
      credentials: 'include',
      cache: 'no-store'
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) {
          setUser(data.user)

          // 👇 Si NO es admin, usar su sucursal directa
          if (data.user.rol_id !== 1) {
            setSucursalActivaState(data.user.sucursal_id)
          }
        } else {
          setUser(null)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // 🔁 Cargar sucursal guardada (solo admin)
  useEffect(() => {
    const stored = localStorage.getItem('sucursal_activa')
    if (stored) {
      setSucursalActivaState(Number(stored))
    }
  }, [])

  const setSucursalActiva = (id: number | null) => {
    if (id === null) {
      localStorage.removeItem('sucursal_activa')
      setSucursalActivaState(null)
      return
    }

    localStorage.setItem('sucursal_activa', id.toString())
    setSucursalActivaState(id)
  }

  // 🚪 Logout
  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Error en logout', err)
    } finally {
      setUser(null)
      setSucursalActivaState(null)
      localStorage.removeItem('sucursal_activa')
      setLoading(false)
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        sucursalActiva,
        setSucursalActiva,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
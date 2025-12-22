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
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 🔐 Cargar usuario al iniciar
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/me`, {
      credentials: 'include',
      cache: 'no-store' // 👈 MUY IMPORTANTE
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.user) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // 🚪 Logout centralizado
  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Error en logout', err)
    } finally {
      // 🔥 LIMPIAR ESTADO LOCAL (CLAVE)
      setUser(null)
      setLoading(false)
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

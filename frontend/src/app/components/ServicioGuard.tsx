'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { API_URL } from '@/utils/api'

export default function ServicioGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [verificado, setVerificado] = useState(false)

  useEffect(() => {
    const enPaginaInactivo = pathname.replace(/\/$/, '') === '/servicio-inactivo'

    fetch(`${API_URL}/api/admin/servicio/status`, { cache: 'no-store' })
      .then((res) => res.json())
      .then(async (data) => {
        const activo = data.activo === true

        if (activo) {
          if (enPaginaInactivo) {
            // Servicio reactivado — redirigir según sesión
            try {
              const meRes = await fetch(`${API_URL}/api/usuarios/me`, { credentials: 'include' })
              if (meRes.ok) {
                const { user } = await meRes.json()
                const destino = user.rol_id === 1 ? '/admin'
                  : user.rol_id === 2 ? '/tecnico'
                  : '/ventas'
                router.replace(destino)
              } else {
                router.replace('/login')
              }
            } catch {
              router.replace('/login')
            }
          } else {
            setVerificado(true)
          }
        } else {
          if (enPaginaInactivo) {
            setVerificado(true)
          } else {
            router.replace('/servicio-inactivo')
          }
        }
      })
      .catch(() => {
        setVerificado(true)
      })
  }, [router, pathname])

  if (!verificado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

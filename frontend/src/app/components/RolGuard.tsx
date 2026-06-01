'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function RolGuard({ rolRequerido, children }: {
  rolRequerido: number
  children: React.ReactNode
}) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || user.rol_id !== rolRequerido) {
        router.replace('/login')
      }
    }
  }, [user, loading, router, rolRequerido])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.rol_id !== rolRequerido) {
    return null
  }

  return <>{children}</>
}

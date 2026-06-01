'use client'

import ServicioGuard from '@/app/components/ServicioGuard'

export default function ServicioInactivoPage() {
  return (
    <ServicioGuard>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-8xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Servicio No Disponible
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            El sistema está temporalmente fuera de servicio.
            <br />
            Contacta al administrador.
          </p>
        </div>
      </div>
    </ServicioGuard>
  )
}

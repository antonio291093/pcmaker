import RolGuard from '@/app/components/RolGuard'
import ServicioGuard from '@/app/components/ServicioGuard'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolGuard rolRequerido={2}>
      <ServicioGuard>
        <div className="flex min-h-screen bg-gray-50">
          {children}
        </div>
      </ServicioGuard>
    </RolGuard>
  )
}

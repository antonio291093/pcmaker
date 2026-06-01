import RolGuard from '@/app/components/RolGuard'
import ServicioGuard from '@/app/components/ServicioGuard'

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolGuard rolRequerido={3}>
      <ServicioGuard>
        <div className="flex min-h-screen bg-gray-50">
          {children}
        </div>
      </ServicioGuard>
    </RolGuard>
  )
}

import RolGuard from '@/app/components/RolGuard'

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolGuard rolRequerido={3}>
      <div className="flex min-h-screen bg-gray-50">
        {children}
      </div>
    </RolGuard>
  )
}

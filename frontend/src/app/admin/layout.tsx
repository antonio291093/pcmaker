import RolGuard from '@/app/components/RolGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolGuard rolRequerido={1}>
      <div className="flex min-h-screen bg-gray-50">
        {children}
      </div>
    </RolGuard>
  )
}

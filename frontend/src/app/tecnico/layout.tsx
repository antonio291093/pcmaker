import RolGuard from '@/app/components/RolGuard'

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RolGuard rolRequerido={2}>
      <div className="flex min-h-screen bg-gray-50">
        {children}
      </div>
    </RolGuard>
  )
}

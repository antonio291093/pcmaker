// src/app/layout.tsx
import './globals.css'
import { ReactNode } from 'react'
import { UserProvider } from '@/context/UserContext'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}

// src/app/layout.tsx
import './globals.css'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { UserProvider } from '@/context/UserContext'

const DEMO_URL = 'https://demo.pcmaker.mx'

// NEXT_PUBLIC_API_URL se fija en build time: solo el build del demo lleva Open Graph.
// Cualquier otro build (ERP de producción, local) no debe indexarse.
const esDemo = process.env.NEXT_PUBLIC_API_URL === DEMO_URL

const TITULO_DEMO = 'PCMaker — ERP para tiendas y talleres de cómputo'
const DESCRIPCION_DEMO =
  'Controla tu negocio de cómputo: ventas, servicios, inventario y comisiones. Solicita acceso a la demo.'
const IMAGEN_DEMO = {
  url: '/og-image.png',
  width: 1200,
  height: 627,
  alt: 'PCMaker, ERP para tiendas y talleres de cómputo',
}

export const metadata: Metadata = esDemo
  ? {
      metadataBase: new URL(DEMO_URL),
      title: TITULO_DEMO,
      description: DESCRIPCION_DEMO,
      openGraph: {
        type: 'website',
        url: DEMO_URL,
        siteName: 'PCMaker',
        locale: 'es_MX',
        title: TITULO_DEMO,
        description: DESCRIPCION_DEMO,
        images: [IMAGEN_DEMO],
      },
      twitter: {
        card: 'summary_large_image',
        title: TITULO_DEMO,
        description: DESCRIPCION_DEMO,
        images: [IMAGEN_DEMO],
      },
    }
  : {
      robots: { index: false, follow: false },
    }

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

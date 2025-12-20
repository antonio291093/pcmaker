import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Validar sesión con backend
  const res = await fetch(`${process.env.API_URL}/api/usuarios/me`, {
    headers: {
      cookie: req.headers.get('cookie') || ''
    }
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { user } = await res.json()
  const rol = user.rol_id

  // Protección por rol
  if (pathname.startsWith('/admin') && rol !== 1) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/tecnico') && rol !== 2) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/ventas') && rol !== 3) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/tecnico/:path*', '/ventas/:path*']
}

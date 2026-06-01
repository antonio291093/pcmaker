import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Siempre pasan sin ninguna verificación
  if (
    pathname.startsWith('/servicio-inactivo') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Verificar estado del servicio — afecta todas las rutas incluido /login
  try {
    const statusRes = await fetch(`${process.env.API_URL}/api/admin/servicio/status`)
    if (statusRes.ok) {
      const { activo } = await statusRes.json()
      if (!activo) {
        return NextResponse.redirect(new URL('/servicio-inactivo', req.url))
      }
    }
  } catch {
    // Backend no responde — deja pasar para no bloquear por error de red
  }

  // /login pasa si el servicio está activo
  if (pathname.startsWith('/login')) {
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
  matcher: ['/admin/:path*', '/tecnico/:path*', '/ventas/:path*', '/login']
}

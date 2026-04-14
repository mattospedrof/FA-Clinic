import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ROLE_PREFIXES: Record<string, string> = {
  admin: '/dashboard/admin',
  clinic: '/dashboard/clinic',
  doctor: '/dashboard/doctor',
  staff: '/dashboard/staff',
  patient: '/dashboard/patient',
}

const ROLE_WHITELIST: Record<string, string[]> = {
  '/dashboard/admin': ['admin'],
  '/dashboard/clinic': ['admin', 'clinic'],
  '/dashboard/doctor': ['admin', 'doctor'],
  '/dashboard/staff': ['admin', 'staff'],
  '/dashboard/patient': ['admin', 'patient'],
}

async function getValidUser(request: NextRequest) {
  const cookieStore = request.cookies.getAll()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore },
        setAll() {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.role) return null

  return { id: user.id, role: profile.role }
}

function clearAuthAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  response.cookies.delete('sb-Refresh-Token')
  response.cookies.delete('sb-Access-Token')
  return response
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // === Rotas publicas (sem auth) ===
  if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/apresentation' || pathname.startsWith('/auth/')) {
    return NextResponse.next({ request })
  }

  // === Rotas nao-protegidas ===
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next({ request })
  }

  // === Dashboard routes ===
  const user = await getValidUser(request)

  if (!user) {
    return clearAuthAndRedirect(request)
  }

  // /dashboard -> redirect por role
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(ROLE_PREFIXES[user.role] || '/dashboard/patient', request.url))
  }

  // Subrota -> verificar permissao
  for (const [route, allowedRoles] of Object.entries(ROLE_WHITELIST)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.redirect(new URL(ROLE_PREFIXES[user.role] || '/dashboard/patient', request.url))
      }
      break
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

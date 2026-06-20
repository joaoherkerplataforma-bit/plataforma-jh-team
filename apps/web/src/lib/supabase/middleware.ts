import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isProtectedRoute =
    pathname.startsWith('/relatorio') ||
    pathname.startsWith('/pacientes') ||
    pathname.startsWith('/tarefas') ||
    pathname.startsWith('/formularios') ||
    pathname.startsWith('/equipe') ||
    pathname.startsWith('/portal')

  const isLoginPage = pathname === '/login'

  // Not authenticated trying to access protected route -> redirect to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Already authenticated on login page -> redirect to profile route (only if profile exists)
  if (user && isLoginPage) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('perfil')
      .eq('id', user.id)
      .single()

    // Only redirect if the user has a valid profile in the usuarios table.
    // If no profile is found, fall through and let the login page render —
    // the layout or login page will handle signing out. This prevents the
    // infinite loop: dashboard -> login -> dashboard when !usuario.
    if (usuario?.perfil) {
      const perfilRoutes: Record<string, string> = {
        joao_admin: '/relatorio',
        pablo: '/relatorio',
        joao_estagiario: '/relatorio',
        aluno: '/portal',
      }

      const redirectTo = perfilRoutes[usuario.perfil] ?? '/relatorio'
      const url = request.nextUrl.clone()
      url.pathname = redirectTo

      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
  }

  return supabaseResponse
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // O assistente de setup foi concluído e a aplicação agora está conectada
  // a um banco de dados real. A lógica de redirecionamento foi desativada.
  // Em um ambiente de produção real, a variável `isSetupCompleted` seria
  // lida de um arquivo .env, que seria criado ao final do processo de setup.
  // Mudar para 'false' habilita o setup wizard novamente.
  const isSetupCompleted = true; 

  if (!isSetupCompleted) {
    const { pathname } = request.nextUrl
    // Evita redirecionar a própria página de setup e os assets do Next.js
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/setup') {
      return NextResponse.next()
    }
    // Redireciona qualquer outra rota para /setup
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // Se já estiver configurado, continua normalmente.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

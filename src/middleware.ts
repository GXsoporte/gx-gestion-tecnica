import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;

    if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (
      pathname.startsWith('/admin') &&
      !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role)
    ) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/clientes/:path*',
    '/actividades/:path*',
    '/tickets/:path*',
    '/inventario/:path*',
    '/mantenimientos/:path*',
    '/diagnostico/:path*',
    '/diagnosticos/:path*',
    '/reportes/:path*',
    '/documentos/:path*',
    '/configuracion/:path*',
    '/super-admin/:path*',
    '/portal/:path*',
    '/portal/tickets/:path*',
    '/portal/inventario/:path*',
    '/portal/soluciones/:path*',
  ],
};

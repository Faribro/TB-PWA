import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { normalizeRole, hasRoutePermission, getDefaultRoute, Role } from "@/lib/constants/roles"
import { updateSession } from "@/utils/supabase/middleware"

// Security headers applied to every response
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default auth(async (req) => {
  // Update Supabase session (refresh tokens if needed)
  await updateSession(req);

  const { pathname } = req.nextUrl;

  // Allow public routes before any auth check
  const publicRoutes = ['/login', '/unauthorized', '/api/auth', '/auth-test', '/api/webhook', '/api/patch-screening-dates'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const userRole = normalizeRole(req.auth?.user?.role);

  // Root redirect
  if (pathname === '/') {
    const dest = req.auth && userRole ? getDefaultRoute(userRole) : '/login';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // /dashboard bare redirect
  if (pathname === '/dashboard') {
    const dest = userRole ? getDefaultRoute(userRole) : '/login';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      const url = new URL('/login', req.url);
      url.searchParams.set('reason', 'expired');
      return NextResponse.redirect(url);
    }
    if (userRole && !hasRoutePermission(userRole, pathname)) {
      return NextResponse.redirect(new URL(getDefaultRoute(userRole), req.url));
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      const url = new URL('/login', req.url);
      url.searchParams.set('reason', 'unauthorized');
      return NextResponse.redirect(url);
    }
    const SUPERUSER_ROLES: readonly string[] = [Role.ADMIN, Role.PROGRAM_MANAGER];
    if (!userRole || !SUPERUSER_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
  runtime: 'nodejs',
};
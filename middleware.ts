import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

// Rate limiting store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit = 100, window = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Prune expired entries opportunistically
    if (rateLimitMap.size > 1000) {
      for (const [k, v] of rateLimitMap) {
        if (now > v.resetTime) rateLimitMap.delete(k);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + window });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Rate limiting for API routes
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
  }
  
  // Allow public routes
  const publicRoutes = ['/login', '/unauthorized', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Redirect root to Command Hub if authenticated, login if not
  if (pathname === '/') {
    if (req.auth) {
      return NextResponse.redirect(new URL('/dashboard/command-hub', req.url));
    } else {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  
  // Redirect /dashboard to Command Hub
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/dashboard/command-hub', req.url));
  }
  
  // Protect dashboard routes with session expiry check
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('reason', 'expired');
      return NextResponse.redirect(loginUrl);
    }
    
    // Check session age (8 hours = 28800 seconds)
    const sessionStart = req.auth.expires ? new Date(req.auth.expires).getTime() - 28800000 : 0;
    const now = Date.now();
    if (now - sessionStart > 28800000) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('reason', 'expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin routes with superuser gatekeeper
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('reason', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }
    const role = req.auth.user?.role;
    if (role !== 'admin' && role !== 'PM') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
  runtime: 'nodejs',
}
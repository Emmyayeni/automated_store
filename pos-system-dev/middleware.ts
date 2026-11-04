import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ROLE_DASHBOARD_PATH } from "./lib/roles";

export async function middleware(req: NextRequest) {
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const url = req.nextUrl.clone();
  
  console.log("=== Middleware Debug ===");
  console.log("Request path:", url.pathname);
  
  // Skip middleware for static files and auth callback paths
  if (url.pathname.startsWith("/_next") || 
      url.pathname.startsWith("/favicon") ||
      url.pathname.startsWith("/manifest") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get the token to check authentication and role
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Protect all API endpoints: return 401 JSON for unauthenticated requests
  if (url.pathname.startsWith("/api")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    return NextResponse.next();
  }
  
  console.log("Token exists:", !!token);
  console.log("Token role:", token?.role);

  // If user is logged in and trying to access login page, redirect to root for role-based routing
  if (token && url.pathname === "/login") {
    console.log("Authenticated user accessing login page, redirecting to root");
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access onboarding, redirect to root for role-based routing
  if (token && url.pathname === "/onboarding") {
    console.log("Authenticated user accessing onboarding page, redirecting to root");
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  // Allow access to: login, root page, and onboarding (for new business setup)
  const publicRoutes = ["/login", "/", "/onboarding"];
  if (!token && !publicRoutes.includes(url.pathname)) {
    console.log("Unauthenticated user accessing protected route, redirecting to login");
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  console.log("Middleware allowing request to continue");
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/ (PWA icons)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
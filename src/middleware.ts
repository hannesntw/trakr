import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// Routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Skip non-API routes (handled by page-level auth checks)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Let the route handler validate the token
    return NextResponse.next();
  }

  // Check for session cookie (Auth.js uses this)
  const sessionCookie = request.cookies.get("authjs.session-token") ?? request.cookies.get("__Secure-authjs.session-token");
  if (sessionCookie) {
    return NextResponse.next();
  }

  // No auth at all
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"],
};

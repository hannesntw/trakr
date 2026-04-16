import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/webhooks", "/api/health", "/api/scim"];

// Rate-limit rules for public routes: [pathPrefix, limit, windowMs]
const RATE_LIMIT_RULES: Array<[string, number, number]> = [
  ["/api/auth/signin", 10, 60_000],
  ["/api/auth/device", 5, 60_000],
  ["/api/scim", 30, 60_000],
];

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit specific public routes before allowing them through
  for (const [prefix, limit, windowMs] of RATE_LIMIT_RULES) {
    if (pathname.startsWith(prefix)) {
      const ip = getClientIp(request);
      const { limited } = rateLimit(`${ip}:${prefix}`, limit, windowMs);
      if (limited) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 },
        );
      }
      break;
    }
  }

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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SignJWT } from "jose";

const BASE_URL = process.env.AUTH_URL ?? "https://stori.zone";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * OAuth 2.0 Authorization Endpoint for MCP clients.
 *
 * If the user is logged in (session cookie), generates an authorization code
 * (a signed JWT) and redirects to the client's redirect_uri.
 *
 * If the user is NOT logged in, redirects to the login page with a callback
 * that returns here after authentication.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const client_id = url.searchParams.get("client_id");
  const redirect_uri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const code_challenge = url.searchParams.get("code_challenge");
  const code_challenge_method = url.searchParams.get("code_challenge_method");
  const response_type = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope");

  // Validate required params
  if (!client_id || !redirect_uri || !code_challenge || !state) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters: client_id, redirect_uri, code_challenge, state" },
      { status: 400 },
    );
  }

  if (response_type && response_type !== "code") {
    return NextResponse.json(
      { error: "unsupported_response_type", error_description: "Only response_type=code is supported" },
      { status: 400 },
    );
  }

  if (code_challenge_method && code_challenge_method !== "S256") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Only S256 code_challenge_method is supported" },
      { status: 400 },
    );
  }

  // Check if the user is logged in via session cookie
  const session = await auth();

  if (!session?.user?.id) {
    // Redirect to login. After login, the user will be sent back here with the same params.
    const callbackUrl = url.toString();
    const loginUrl = new URL("/login", BASE_URL);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl.toString());
  }

  // User is authenticated. Auto-approve and generate an authorization code.
  // The code is a signed JWT containing the PKCE challenge and user info.
  const code = await new SignJWT({
    sub: session.user.id,
    client_id,
    code_challenge,
    redirect_uri,
    scope: scope ?? "stori",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer(BASE_URL)
    .sign(getSecret());

  // Redirect to the client's redirect_uri with the code and state
  const redirectTarget = new URL(redirect_uri);
  redirectTarget.searchParams.set("code", code);
  redirectTarget.searchParams.set("state", state);

  return NextResponse.redirect(redirectTarget.toString());
}

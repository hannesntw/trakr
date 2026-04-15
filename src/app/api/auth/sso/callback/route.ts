import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ssoConfigurations,
  users,
  accounts,
  sessions,
  organizationMembers,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "crypto";

interface OidcTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

interface IdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  nonce?: string;
  [key: string]: unknown;
}

/**
 * Decode a JWT payload without verifying the signature.
 * In production you'd verify the signature against the IdP's JWKS,
 * but for this implementation we rely on the TLS connection to the
 * token endpoint (back-channel) for integrity.
 */
function decodeJwtPayload(jwt: string): IdTokenPayload {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload);
}

/**
 * GET /api/auth/sso/callback?code=...&state=...
 *
 * Handles the OIDC authorization code callback:
 * 1. Validates state against the cookie
 * 2. Exchanges code for tokens at the IdP token endpoint
 * 3. Decodes the ID token to get user info
 * 4. Creates or finds the user in the DB
 * 5. Adds them to the org if not already a member
 * 6. Creates a session and redirects to /projects
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    const desc = request.nextUrl.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(desc)}`, request.nextUrl.origin),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/login?error=Missing+code+or+state", request.nextUrl.origin),
    );
  }

  // Validate state from cookie
  const cookieStore = await cookies();
  const ssoCookie = cookieStore.get("sso_state");
  if (!ssoCookie) {
    return NextResponse.redirect(
      new URL("/login?error=SSO+session+expired", request.nextUrl.origin),
    );
  }

  let ssoState: { state: string; nonce: string; orgId: number; email: string };
  try {
    ssoState = JSON.parse(ssoCookie.value);
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=Invalid+SSO+state", request.nextUrl.origin),
    );
  }

  if (ssoState.state !== state) {
    return NextResponse.redirect(
      new URL("/login?error=State+mismatch+(possible+CSRF)", request.nextUrl.origin),
    );
  }

  // Clear the SSO state cookie
  cookieStore.delete("sso_state");

  // Load the org's SSO config
  const [ssoConfig] = await db
    .select()
    .from(ssoConfigurations)
    .where(eq(ssoConfigurations.orgId, ssoState.orgId));

  if (!ssoConfig || ssoConfig.protocol !== "oidc") {
    return NextResponse.redirect(
      new URL("/login?error=SSO+not+configured", request.nextUrl.origin),
    );
  }

  // Discover the token endpoint
  let tokenEndpoint: string;
  let userinfoEndpoint: string | undefined;
  try {
    const discoveryUrl = ssoConfig.discoveryUrl!.endsWith("/.well-known/openid-configuration")
      ? ssoConfig.discoveryUrl!
      : `${ssoConfig.discoveryUrl!.replace(/\/$/, "")}/.well-known/openid-configuration`;

    const discoveryRes = await fetch(discoveryUrl, { next: { revalidate: 3600 } });
    const discovery = await discoveryRes.json();
    tokenEndpoint = discovery.token_endpoint;
    userinfoEndpoint = discovery.userinfo_endpoint;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=Failed+to+reach+identity+provider", request.nextUrl.origin),
    );
  }

  // Exchange authorization code for tokens
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/sso/callback`;

  let tokenData: OidcTokenResponse;
  try {
    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: ssoConfig.clientId!,
        client_secret: ssoConfig.clientSecret ?? "",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[sso] Token exchange failed:", errBody);
      return NextResponse.redirect(
        new URL("/login?error=Token+exchange+failed", request.nextUrl.origin),
      );
    }

    tokenData = await tokenRes.json();
  } catch (err) {
    console.error("[sso] Token exchange error:", err);
    return NextResponse.redirect(
      new URL("/login?error=Token+exchange+failed", request.nextUrl.origin),
    );
  }

  // Decode the ID token
  let idToken: IdTokenPayload;
  try {
    idToken = decodeJwtPayload(tokenData.id_token);
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=Invalid+ID+token", request.nextUrl.origin),
    );
  }

  // Validate nonce
  if (idToken.nonce !== ssoState.nonce) {
    return NextResponse.redirect(
      new URL("/login?error=Nonce+mismatch", request.nextUrl.origin),
    );
  }

  const email = idToken.email ?? ssoState.email;
  const name = idToken.name ?? ([idToken.given_name, idToken.family_name].filter(Boolean).join(" ") || null);

  // Find or create user
  let [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email,
        name,
        emailVerified: idToken.email_verified ? new Date() : null,
        image: typeof idToken.picture === "string" ? idToken.picture : null,
      })
      .returning();
  } else if (name && !user.name) {
    // Update name if we have one from the IdP but not locally
    await db.update(users).set({ name }).where(eq(users.id, user.id));
  }

  // Link the OIDC account if not already linked
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, "org-sso"),
        eq(accounts.providerAccountId, idToken.sub),
      ),
    );

  if (!existingAccount) {
    await db.insert(accounts).values({
      userId: user.id,
      type: "oidc",
      provider: "org-sso",
      providerAccountId: idToken.sub,
      access_token: tokenData.access_token,
      id_token: tokenData.id_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: tokenData.expires_in
        ? Math.floor(Date.now() / 1000) + tokenData.expires_in
        : null,
      token_type: tokenData.token_type,
      scope: "openid email profile",
    });
  }

  // Add user to org if not already a member
  const [existingMember] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, ssoState.orgId),
        eq(organizationMembers.userId, user.id),
      ),
    );

  if (!existingMember) {
    await db.insert(organizationMembers).values({
      orgId: ssoState.orgId,
      userId: user.id,
      role: "member",
    });
  }

  // Create a session compatible with Auth.js
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  // Set the session cookie (same name Auth.js uses)
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  cookieStore.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    expires,
    path: "/",
  });

  return NextResponse.redirect(new URL("/projects", request.nextUrl.origin));
}

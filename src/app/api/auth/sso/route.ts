import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ssoConfigurations, verifiedDomains, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

/**
 * GET /api/auth/sso?email=user@example.com
 *
 * Checks whether the email's domain has an org with enforced SSO.
 * - If OIDC SSO is enforced: redirects to the IdP authorization URL.
 * - If SAML SSO is enforced: returns a message to contact support.
 * - If no SSO: returns { sso: false }.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email parameter required" }, { status: 400 });
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Find a verified domain that matches and has requireSso
  const [domainRow] = await db
    .select()
    .from(verifiedDomains)
    .where(
      and(
        eq(verifiedDomains.domain, domain),
        eq(verifiedDomains.status, "verified"),
      )
    );

  if (!domainRow) {
    return NextResponse.json({ sso: false });
  }

  // Check if the org has an SSO config that's enforced
  const [ssoConfig] = await db
    .select()
    .from(ssoConfigurations)
    .where(
      and(
        eq(ssoConfigurations.orgId, domainRow.orgId),
        eq(ssoConfigurations.enforced, true),
      )
    );

  if (!ssoConfig) {
    return NextResponse.json({ sso: false });
  }

  // SAML: stub — not fully implemented yet
  if (ssoConfig.protocol === "saml") {
    return NextResponse.json({
      sso: true,
      protocol: "saml",
      message: "SAML SSO is configured but requires additional setup. Please contact support.",
    });
  }

  // OIDC: redirect to the IdP
  if (ssoConfig.protocol === "oidc") {
    if (!ssoConfig.discoveryUrl || !ssoConfig.clientId) {
      return NextResponse.json(
        { error: "OIDC SSO is not fully configured (missing discoveryUrl or clientId)" },
        { status: 500 },
      );
    }

    // Discover the authorization endpoint from the OIDC discovery document
    let authorizationEndpoint: string;
    try {
      const discoveryRes = await fetch(
        ssoConfig.discoveryUrl.endsWith("/.well-known/openid-configuration")
          ? ssoConfig.discoveryUrl
          : `${ssoConfig.discoveryUrl.replace(/\/$/, "")}/.well-known/openid-configuration`,
        { next: { revalidate: 3600 } },
      );
      if (!discoveryRes.ok) {
        return NextResponse.json(
          { error: "Failed to fetch OIDC discovery document" },
          { status: 502 },
        );
      }
      const discovery = await discoveryRes.json();
      authorizationEndpoint = discovery.authorization_endpoint;
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch OIDC discovery document" },
        { status: 502 },
      );
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(16).toString("hex");

    // Store state + org info in a cookie so the callback can validate
    const cookieStore = await cookies();
    cookieStore.set("sso_state", JSON.stringify({
      state,
      nonce,
      orgId: domainRow.orgId,
      email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/sso/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: ssoConfig.clientId,
      redirect_uri: redirectUri,
      scope: "openid email profile",
      state,
      nonce,
      login_hint: email,
    });

    const authUrl = `${authorizationEndpoint}?${params.toString()}`;

    return NextResponse.json({ sso: true, protocol: "oidc", redirectUrl: authUrl });
  }

  return NextResponse.json({ sso: false });
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

const BASE_URL = process.env.AUTH_URL ?? "https://stori.zone";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Compute the S256 code challenge from a code_verifier.
 * Per RFC 7636: BASE64URL(SHA256(code_verifier))
 */
function computeS256Challenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * OAuth 2.0 Token Endpoint for MCP clients.
 *
 * Accepts authorization_code grant with PKCE verification.
 * Creates a real API key (same as manual key creation) and returns it
 * as an access_token.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string>;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await request.json();
  }

  const { grant_type, code, code_verifier, client_id, redirect_uri } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Only authorization_code is supported" },
      { status: 400 },
    );
  }

  if (!code || !code_verifier || !client_id) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters: code, code_verifier, client_id" },
      { status: 400 },
    );
  }

  // Verify the authorization code (JWT)
  let payload;
  try {
    const result = await jwtVerify(code, getSecret(), {
      issuer: BASE_URL,
    });
    payload = result.payload;
  } catch {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400 },
    );
  }

  // Verify client_id matches
  if (payload.client_id !== client_id) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "client_id mismatch" },
      { status: 400 },
    );
  }

  // Verify redirect_uri matches (if provided)
  if (redirect_uri && payload.redirect_uri !== redirect_uri) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  // PKCE verification: hash the code_verifier and compare to stored code_challenge
  const computedChallenge = computeS256Challenge(code_verifier);
  if (computedChallenge !== payload.code_challenge) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "PKCE verification failed" },
      { status: 400 },
    );
  }

  // All checks passed. Create a real API key for this user.
  const userId = payload.sub;
  if (!userId) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "No user associated with this code" },
      { status: 400 },
    );
  }

  const rawKey = "str_" + randomBytes(24).toString("base64url");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 8);

  await db.insert(apiKeys).values({
    userId,
    keyHash,
    keyPrefix,
    label: `MCP OAuth — authorized ${new Date().toLocaleDateString()}`,
  });

  return NextResponse.json({
    access_token: rawKey,
    token_type: "bearer",
    scope: (payload.scope as string) ?? "stori",
  });
}

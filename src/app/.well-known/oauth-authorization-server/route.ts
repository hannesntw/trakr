import { NextResponse } from "next/server";

const BASE_URL = process.env.AUTH_URL ?? "https://stori.zone";

export function GET() {
  return NextResponse.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/api/mcp/authorize`,
    token_endpoint: `${BASE_URL}/api/mcp/token`,
    registration_endpoint: `${BASE_URL}/api/mcp/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["stori"],
  });
}

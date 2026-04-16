import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    token_endpoint_auth_method,
  } = body;

  if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "client_name and redirect_uris are required" },
      { status: 400 },
    );
  }

  // Deterministic client_id from registration data so the same client
  // gets the same ID without needing storage (Vercel is stateless).
  const client_id = createHash("sha256")
    .update(JSON.stringify({ client_name, redirect_uris }))
    .digest("hex")
    .slice(0, 16);

  return NextResponse.json({
    client_id,
    client_name,
    redirect_uris,
    grant_types: grant_types ?? ["authorization_code"],
    response_types: response_types ?? ["code"],
    token_endpoint_auth_method: token_endpoint_auth_method ?? "none",
  }, { status: 201 });
}

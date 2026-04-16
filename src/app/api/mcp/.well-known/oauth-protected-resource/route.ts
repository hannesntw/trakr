import { NextResponse } from "next/server";

const BASE_URL = process.env.AUTH_URL ?? "https://stori.zone";

export function GET() {
  return NextResponse.json({
    resource: `${BASE_URL}/api/mcp`,
    authorization_servers: [BASE_URL],
    bearer_methods_supported: ["header"],
  });
}

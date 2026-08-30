import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal API auth (Phase 1A).
 *
 * Model:
 *   - Write endpoints require `Authorization: Bearer <PLATFORM_API_KEY>`
 *     for cross-origin callers (the SDK, other servers, agents).
 *   - Same-origin browser requests (our own frontend) are exempt — the
 *     platform's own UI is a first-class consumer and cannot hold a secret.
 *   - Read endpoints stay public.
 *   - If PLATFORM_API_KEY is not configured, writes stay open (opt-in auth,
 *     backward compatible with existing deployments).
 *   - Non-production environments skip the check entirely (local dev).
 *
 * This is a compatibility strategy, not a complete security boundary —
 * dangerous endpoints (metadata/signature/collections) additionally carry
 * per-IP rate limits, and the signing service's real secret is
 * SIGNER_PRIVATE_KEY. A full per-agent key model is v2.
 */
const WRITE_PREFIXES = ["/api/agents", "/api/collections", "/api/signature", "/api/metadata/generate"];
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function isWritePath(pathname: string): boolean {
  return WRITE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isWrite = WRITE_METHODS.includes(req.method) && isWritePath(pathname);
  if (!pathname.startsWith("/api/") || !isWrite) {
    return NextResponse.next(); // reads stay public
  }
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next(); // local dev / tests
  }
  if (isSameOrigin(req)) {
    return NextResponse.next(); // our own frontend
  }

  const platformKey = process.env.PLATFORM_API_KEY;
  if (!platformKey) {
    return NextResponse.next(); // auth not configured → open (backward compatible)
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${platformKey}`) {
    return NextResponse.next();
  }
  return NextResponse.json({ error: "Unauthorized — missing or invalid API key" }, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"],
};

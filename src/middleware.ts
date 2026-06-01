import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isClerkConfigured() {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

function verifyScannerBearer(req: Request): boolean {
  const secret = process.env.INGEST_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === secret;
}

function scannerBypass(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;
  if (
    (path.startsWith("/api/ingest") ||
      path.startsWith("/api/research/linkedin")) &&
    verifyScannerBearer(req)
  ) {
    return NextResponse.next();
  }
  if (
    path.startsWith("/api/automation") &&
    req.method === "PATCH" &&
    verifyScannerBearer(req)
  ) {
    return NextResponse.next();
  }
  return null;
}

/** 未配置 Clerk 时：仅扫描机 API 鉴权，其余放行 */
function localMiddleware(req: NextRequest) {
  return scannerBypass(req) ?? NextResponse.next();
}

/** 配置了 Clerk 时再加载，避免缺少 publishableKey 崩溃 */
async function clerkMiddlewareHandler(req: NextRequest) {
  const bypass = scannerBypass(req);
  if (bypass) return bypass;

  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );
  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
  ]);

  const handler = clerkMiddleware(async (auth, request) => {
    if (isPublicRoute(request)) return NextResponse.next();
    await auth.protect();
  });

  return handler(req, {} as never);
}

export default function middleware(req: NextRequest) {
  if (!isClerkConfigured()) {
    return localMiddleware(req);
  }
  return clerkMiddlewareHandler(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

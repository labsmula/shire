import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/candidate", "/recruiter", "/admin", "/dashboard"];

function hasPrivySession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID && !process.env.PRIVY_APP_SECRET) {
    return true;
  }
  return Boolean(
    request.cookies.get("privy-id-token")?.value ||
      request.cookies.get("privy-token")?.value ||
      request.headers.get("authorization"),
  );
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPath = protectedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!protectedPath || hasPrivySession(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/connect";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/candidate/:path*", "/recruiter/:path*", "/admin/:path*", "/dashboard/:path*"],
};

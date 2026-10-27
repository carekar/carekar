import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

// Sends visitors without a dashboard session to the login page. The session itself (and the
// person's role) is verified by the API on every page via requireAdmin in the admin layout.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(ADMIN_COOKIE)?.value;

  if (!hasSession && pathname !== "/admin/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = adminToken();
  const loggedIn = !!token && req.cookies.get(ADMIN_COOKIE)?.value === token;

  if (!loggedIn && pathname !== "/admin/login") {
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

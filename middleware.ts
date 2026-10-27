import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";
import { hasSupabaseAuth, supabaseAnonKey, supabaseUrl } from "@/lib/env";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });
  let loggedIn: boolean;

  if (hasSupabaseAuth()) {
    // Refreshes the Supabase session cookie on every admin request.
    const sb = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const c of list) req.cookies.set(c.name, c.value);
          res = NextResponse.next({ request: req });
          for (const c of list) res.cookies.set(c.name, c.value, c.options);
        },
      },
    });
    loggedIn = !!(await sb.auth.getUser()).data.user;
  } else {
    loggedIn = req.cookies.get(ADMIN_COOKIE)?.value === adminToken();
  }

  if (!loggedIn && pathname !== "/admin/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };

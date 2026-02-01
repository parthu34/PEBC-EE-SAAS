
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/exam", "/results", "/admin"];
const ADMIN_PREFIX = "/admin";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if(!needsAuth) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if(!token) return NextResponse.redirect(new URL("/login", req.url));

  try{
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev_dev_dev");
    const { payload } = await jwtVerify(token, secret);
    const isAdmin = (payload as any).isAdmin;
    if(pathname.startsWith(ADMIN_PREFIX) && !isAdmin){
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }catch{
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = { matcher: ["/dashboard/:path*", "/exam/:path*", "/results/:path*", "/admin/:path*"] };

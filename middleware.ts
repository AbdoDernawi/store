import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/lib/auth/session";
import { protectedRoleGroups, roleHomePath } from "@/types/auth";

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

function protectedGroupFor(pathname: string) {
  return protectedRoleGroups.find(
    (group) => pathname === group.prefix || pathname.startsWith(`${group.prefix}/`),
  );
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySession(token);

  if (isAuthPath(pathname) && user) {
    return redirectTo(request, roleHomePath[user.role]);
  }

  const protectedGroup = protectedGroupFor(pathname);

  if (!protectedGroup) {
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  }

  if (!protectedGroup.roles.includes(user.role)) {
    return redirectTo(request, roleHomePath[user.role]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "./lib/auth";

const USER = process.env.CRM_BASIC_AUTH_USER;
const PASSWORD = process.env.CRM_BASIC_AUTH_PASSWORD;

function unauthorized() {
  return new NextResponse("Authentification requise", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CRM NextLevel", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(req: NextRequest) {
  if (!isAuthorized(req.headers.get("authorization"), USER, PASSWORD)) {
    return unauthorized();
  }

  if (req.method === "POST" && req.nextUrl.pathname === "/leads") {
    return NextResponse.rewrite(new URL("/api/leads", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

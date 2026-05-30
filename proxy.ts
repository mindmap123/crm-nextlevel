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
  if (isAuthorized(req.headers.get("authorization"), USER, PASSWORD)) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

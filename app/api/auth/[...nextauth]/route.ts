export const dynamic = 'force-dynamic';

import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function fixRequest(req: NextRequest): NextRequest {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host && (req.nextUrl.host !== host || req.nextUrl.protocol !== `${proto}:`)) {
    const url = req.nextUrl.clone();
    url.protocol = proto.endsWith(":") ? proto : `${proto}:`;
    url.host = host;
    url.port = "";
    return new NextRequest(url.toString(), req);
  }
  return req;
}

export const GET = (req: NextRequest) => handlers.GET(fixRequest(req));
export const POST = (req: NextRequest) => handlers.POST(fixRequest(req));

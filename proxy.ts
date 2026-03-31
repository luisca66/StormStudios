import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const PERMANENT_REDIRECTS: Record<string, string> = {
  "/": "/es",
  "/inicio": "/es",
  "/es/inicio": "/es",
  "/start": "/en",
  "/en/start": "/en",
  "/apps-2": "/es/apps",
  "/en/apps-2": "/en/apps",
  "/lessons-workshop": "/es/clases-taller",
  "/en/lessons-workshop": "/en/classes-workshop",
};

const GONE_PATTERNS = [
  /^\/(?:(?:es|en)\/)?(?:category|tag|author)(?:\/.*)?$/i,
  /^\/(?:(?:es|en)\/)?(?:feed|comments\/feed)(?:\/.*)?$/i,
  /^\/(?:(?:es|en)\/)?page\/\d+$/i,
  /^\/(?:(?:es|en)\/)?\d{4}\/\d{2}\/\d{2}\/[^/]+$/i,
];

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function buildRedirectResponse(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, 308);
}

function buildGoneResponse() {
  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export default function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const redirectTarget = PERMANENT_REDIRECTS[pathname];

  if (redirectTarget) {
    return buildRedirectResponse(request, redirectTarget);
  }

  if (GONE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return buildGoneResponse();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|tools|apps|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|mp4|pdf|html)).*)",
  ],
};

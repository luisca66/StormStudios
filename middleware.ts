import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Aplica el middleware a todas las rutas excepto:
  // - Archivos estáticos (_next/static, _next/image, favicon, etc.)
  // - API routes
  matcher: [
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|tools|apps|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|mp4|pdf|html)).*)",
  ],
};

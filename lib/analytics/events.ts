import { z } from "zod";
import { routing } from "@/i18n/routing";
import { APPS } from "@/data/apps/apps-catalog";
import { LESSON_URL_SLUGS, RESOURCE_SLUGS } from "@/data/seo/localized-slugs";
import publicPaths from "./public-paths.json";
import { campaignLabel, referrerDomain } from "./privacy";

export const EVENT_NAMES = ["page_view", "amazon_click", "contact_click", "contact_success", "app_open", "store_click", "notify_success"] as const;
export type EventName = (typeof EVENT_NAMES)[number];

const knownPaths = new Set(publicPaths);
const appPaths = new Map<string, string>();
const lessonPaths = new Set<string>();
for (const locale of routing.locales) {
  for (const route of Object.values(routing.pathnames)) {
    const localized = typeof route === "string" ? route : route[locale];
    if (!localized.includes("[")) knownPaths.add(`/${locale}${localized === "/" ? "" : localized}`);
  }
  for (const slugs of Object.values(LESSON_URL_SLUGS)) {
    const route = `/${locale}/${locale === "es" ? "curso-armonia" : "harmony-course"}/${slugs[locale]}`;
    knownPaths.add(route);
    lessonPaths.add(route);
  }
  for (const slugs of Object.values(RESOURCE_SLUGS)) {
    knownPaths.add(`/${locale}/${locale === "es" ? "recursos" : "resources"}/${slugs[locale]}`);
  }
  for (const app of APPS) {
    knownPaths.add(`/${locale}/apps/${app.slug}`);
    for (const route of [app.webUrl, app.gameUrl]) {
      if (!route) continue;
      const translation = routing.pathnames[route as keyof typeof routing.pathnames];
      const localized = typeof translation === "object" ? translation[locale] : route;
      const appPath = `/${locale}${localized}`;
      knownPaths.add(appPath);
      appPaths.set(appPath, appPath);
    }
  }
  // La ruta histórica sigue siendo una herramienta accesible.
  appPaths.set(`/${locale}/intervalos`, `/${locale}/intervalos`);
}
for (const route of publicPaths) {
  if (/^\/(apps|tools)\//.test(route)) {
    appPaths.set(route, route);
    if (route.endsWith("/index.html")) {
      knownPaths.add(route.slice(0, -11));
      appPaths.set(route.slice(0, -11), route);
    }
  }
}

export function publicPath(value: string): string | null {
  // No query strings, fragments, encoded paths, IDs or unknown slugs.
  const pathname = value.replace(/\/$/, "");
  return knownPaths.has(pathname) ? pathname : null;
}

const optionalLabel = z.string().max(512).optional().default("");
export const contextSchema = z.object({
  path: z.string().max(200),
  language: z.enum(["es", "en"]),
  referrer: optionalLabel,
  utm_source: optionalLabel,
  utm_campaign: optionalLabel,
}).strict();
const eventSchema = contextSchema.extend({
  name: z.enum(EVENT_NAMES),
  destination: z.string().max(200).optional().default(""),
}).strict();
export type MeasurementContext = z.input<typeof contextSchema>;
export type MeasurementEvent = z.output<typeof eventSchema>;

const amazonDestinations = new Set([
  "kindle:amazon.com.mx", "paperback:amazon.com.mx", "hardcover:amazon.com.mx",
  "kindle:amazon.com", "paperback:amazon.com", "hardcover:amazon.com",
]);

export function normalizeEvent(input: unknown): MeasurementEvent | null {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return null;
  const event = parsed.data;
  const path = publicPath(event.path);
  if (!path || (/^\/(es|en)(\/|$)/.test(path) && path.split("/")[1] !== event.language)) return null;
  if (event.name === "amazon_click" && !amazonDestinations.has(event.destination)) return null;
  if (event.name === "contact_click" && !(
    (event.destination === "home" && /^\/(es|en)$/.test(path)) ||
    (event.destination === "lesson" && lessonPaths.has(path))
  )) return null;
  if (event.name === "contact_success" && !["/es/contacto", "/en/contact"].includes(path)) return null;
  if (event.name === "store_click" && !["play:apsuper", "appstore:apsuper"].includes(event.destination)) return null;
  if (event.name === "notify_success" && !(
    (event.destination === "leccion" && lessonPaths.has(path)) ||
    (event.destination === "catalogo" && ["/es/apps", "/en/apps"].includes(path)) ||
    (event.destination === "libro" && ["/es/el-libro", "/en/the-book"].includes(path))
  )) return null;
  if (event.name === "app_open" && !appPaths.has(path)) return null;
  return {
    ...event, path,
    destination: event.name === "page_view" ? "" : event.name === "contact_success" ? "form" :
      event.name === "app_open" ? appPaths.get(path)! : event.destination,
    referrer: referrerDomain(event.referrer),
    utm_source: campaignLabel(event.utm_source),
    utm_campaign: campaignLabel(event.utm_campaign),
  };
}

export function appDestination(path: string): string | undefined { return appPaths.get(path); }

// Stable column contract for scripts/analytics-monthly.mjs. No personal index.
export function dataPoint(event: MeasurementEvent) {
  return { indexes: [event.name], blobs: [event.name, event.path, event.language,
    event.destination, event.referrer, event.utm_source, event.utm_campaign], doubles: [1] };
}

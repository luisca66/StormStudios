import type { NextRequest } from "next/server";

const AUDIO_BUCKET_BASE = process.env.AUDIO_BUCKET_BASE_URL || "https://samples.stormstudios.com.mx";
const UPSTREAM_TIMEOUT_MS = 15_000;
const SAFE_SEGMENT = /^[\w .#%()-]+$/;

type Context = {
  params: Promise<{ path: string[] }>;
};

function buildAudioUrl(path: string[]) {
  if (path.length === 0) return null;
  if (path.some((segment) => segment === ".." || segment.includes("/") || !SAFE_SEGMENT.test(segment))) {
    return null;
  }

  return `${AUDIO_BUCKET_BASE}/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers();
  const passthroughHeaders = [
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ];

  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }

  // Los nombres de samples no tienen hash: deben poder actualizarse. Nunca
  // conservar un 404/5xx, aunque el proveedor envíe una política permisiva.
  headers.set("cache-control", upstream.ok || upstream.status === 304
    ? "public, max-age=3600, must-revalidate"
    : "no-store");

  return headers;
}

async function proxyAudio(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const audioUrl = buildAudioUrl(path);

  if (!audioUrl) {
    return new Response("Invalid audio path", { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");
  const ifNoneMatch = request.headers.get("if-none-match");
  const ifModifiedSince = request.headers.get("if-modified-since");

  if (range) upstreamHeaders.set("range", range);
  if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);
  if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);

  try {
    const upstream = await fetch(audioUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildResponseHeaders(upstream),
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return new Response(request.method === "HEAD" ? null : "Audio temporarily unavailable", {
      status: timeout ? 504 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET(request: NextRequest, context: Context) {
  return proxyAudio(request, context);
}

export async function HEAD(request: NextRequest, context: Context) {
  return proxyAudio(request, context);
}

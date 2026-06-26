import type { NextRequest } from "next/server";

const AUDIO_BUCKET_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
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

  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  return headers;
}

async function proxyAudio(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const audioUrl = buildAudioUrl(path);

  if (!audioUrl) {
    return new Response("Invalid audio path", { status: 400 });
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");
  const ifNoneMatch = request.headers.get("if-none-match");
  const ifModifiedSince = request.headers.get("if-modified-since");

  if (range) upstreamHeaders.set("range", range);
  if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);
  if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);

  const upstream = await fetch(audioUrl, {
    headers: upstreamHeaders,
    cache: "force-cache",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(upstream),
  });
}

export async function GET(request: NextRequest, context: Context) {
  return proxyAudio(request, context);
}

export async function HEAD(request: NextRequest, context: Context) {
  return proxyAudio(request, context);
}

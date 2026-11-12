// Standalone HTML apps. An iframe is counted by its Next.js launch page.
(() => {
  if (window.top !== window.self) return;
  try {
    const url = new URL(window.location.href);
    const campaign = (value) => value && value.length <= 64 && /^[a-z][a-z0-9_-]*$/i.test(value) &&
      !/[a-f0-9]{24,}|\d{7,}/i.test(value) && !/^[a-f0-9]{8}-[a-f0-9]{4}-/i.test(value) ? value : "";
    let referrer = "";
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) referrer = host;
    }
    const language = /(?:-en\.html|^\/en\/)/.test(url.pathname) || document.documentElement.lang === "en" ? "en" : "es";
    void fetch("/api/events", {
      method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", path: url.pathname, language,
        referrer,
        utm_source: campaign(url.searchParams.get("utm_source")),
        utm_campaign: campaign(url.searchParams.get("utm_campaign")) }),
    }).catch(() => {});
  } catch { /* Never interrupt a game. */ }
})();

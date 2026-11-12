export function referrerDomain(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    const host = url.hostname.toLowerCase();
    return host.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ? host : "";
  } catch { return ""; }
}

export function campaignLabel(value: string): string {
  // Only campaign slugs. Exclude URLs, emails, UUIDs and long numeric IDs.
  return value.length <= 64 && /^[a-z][a-z0-9_-]*$/i.test(value) &&
    !/[a-f0-9]{24,}|\d{7,}/i.test(value) &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-/i.test(value) ? value : "";
}

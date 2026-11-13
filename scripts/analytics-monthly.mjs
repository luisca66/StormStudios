import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function monthRange(month) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Usa un mes YYYY-MM (2000–2099).");
  const [year, number] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end };
}

export function monthlyQueries(month) {
  const { start, end } = monthRange(month);
  const from = `FROM storm_site_events WHERE timestamp >= toDateTime('${start} 00:00:00') AND timestamp < toDateTime('${end} 00:00:00')`;
  const count = "SUM(_sample_interval) AS total";
  return {
    events: `SELECT blob1 AS event, ${count} ${from} GROUP BY event ORDER BY total DESC FORMAT JSON`,
    pages: `SELECT blob2 AS path, blob3 AS language, ${count} ${from} AND blob1 = 'page_view' GROUP BY path, language ORDER BY total DESC LIMIT 20 FORMAT JSON`,
    amazon: `SELECT blob4 AS destination, blob3 AS language, ${count} ${from} AND blob1 = 'amazon_click' GROUP BY destination, language ORDER BY total DESC FORMAT JSON`,
    contacts: `SELECT blob1 AS event, blob4 AS destination, ${count} ${from} AND blob1 IN ('contact_click', 'contact_success') GROUP BY event, destination ORDER BY total DESC FORMAT JSON`,
    sources: `SELECT blob5 AS referrer, blob6 AS source, blob7 AS campaign, ${count} ${from} AND blob1 = 'page_view' GROUP BY referrer, source, campaign ORDER BY total DESC LIMIT 30 FORMAT JSON`,
    apps: `SELECT blob4 AS destination, ${count} ${from} AND blob1 = 'app_open' GROUP BY destination ORDER BY total DESC LIMIT 20 FORMAT JSON`,
  };
}

function cell(value) {
  return String(value ?? "").replace(/[\r\n]/g, " ").replace(/[\\|`<>\[\]]/g, (character) => `\\${character}`);
}
function count(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error("La API devolvió un conteo inválido.");
  return number.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}
function table(headers, rows) {
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`,
    ...(rows.length ? rows.map((row) => `| ${row.map(cell).join(" | ")} |`) :
      [`| Sin eventos ${headers.slice(1).map(() => "| —").join(" ")} |`])].join("\n");
}

export function renderReport(month, results) {
  const { start, end } = monthRange(month);
  const visits = results.events.find((row) => row.event === "page_view")?.total ?? 0;
  return `# Storm Studios — medición ${month}

Periodo UTC: ${start} 00:00 inclusive a ${end} 00:00 exclusivo.

Visitas (vistas de página): **${count(visits)}**. No son personas ni sesiones únicas.
Conteos ponderados con SUM(_sample_interval); pueden ser estimaciones por muestreo.
Se cuentan cargas y navegación a otra ruta; recargas cuentan, cambios de query/hash no.

## Eventos

${table(["Evento", "Cantidad"], results.events.map((r) => [r.event, count(r.total)]))}

## Páginas principales (20)

${table(["Ruta", "Idioma", "Visitas"], results.pages.map((r) => [r.path, r.language, count(r.total)]))}

## Clics a Amazon por formato y tienda

${table(["Formato:tienda", "Idioma", "Clics"], results.amazon.map((r) => [r.destination, r.language, count(r.total)]))}

## Contactos

${table(["Evento", "Origen/medio", "Cantidad"], results.contacts.map((r) => [r.event, r.destination, count(r.total)]))}

contact_click: home = inicio, lesson = lección. contact_success: form = correo aceptado por Resend.
Son acciones; no identificamos contactos únicos ni enlazamos clics con envíos.

## Fuentes (30 combinaciones principales, solo vistas)

${table(["Dominio de procedencia", "utm_source", "utm_campaign", "Visitas"], results.sources.map((r) => [r.referrer || "directo/desconocido", r.source || "—", r.campaign || "—", count(r.total)]))}

Las etiquetas corresponden a la URL de cada página; no se conservan entre páginas.
Un dominio propio indica navegación interna o recarga, no una nueva adquisición.

## Aperturas de apps y juegos (20)

${table(["Destino", "Aperturas"], results.apps.map((r) => [r.destination, count(r.total)]))}

Una apertura es la llegada a la página de ejecución, no una partida completada.
Bloqueadores, JavaScript desactivado, bots y fallos de red pueden afectar los conteos.
Analytics Engine conserva datos tres meses; archiva este resumen mensualmente.
`;
}

/** @param {Record<string, string | undefined>} env */
export async function run(month, output, env = process.env, fetcher = fetch) {
  const queries = monthlyQueries(month);
  const token = env.CLOUDFLARE_ANALYTICS_API_TOKEN;
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !/^[a-f0-9]{32}$/i.test(account ?? "")) {
    throw new Error("Define CLOUDFLARE_ANALYTICS_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.");
  }
  const results = {};
  for (const [key, query] of Object.entries(queries)) {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
      body: query, signal: AbortSignal.timeout(30_000),
    });
    // Never print response bodies or headers: those may reflect credentials.
    if (!response.ok) throw new Error(`Analytics Engine respondió HTTP ${response.status} (${key}).`);
    const json = await response.json();
    if (!Array.isArray(json.data)) throw new Error(`Respuesta inválida de Analytics Engine (${key}).`);
    results[key] = json.data;
  }
  const report = renderReport(month, results);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, report, "utf8");
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const previous = new Date();
  previous.setUTCDate(1);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const month = process.argv[2] ?? previous.toISOString().slice(0, 7);
  const output = process.argv[3] ?? `reports/analytics/${month}.md`;
  try {
    await run(month, output);
    console.log(`Resumen guardado en ${output}`);
  } catch (error) {
    // Network errors can contain arbitrary response details; use fixed text.
    console.error(error instanceof Error && /^(Usa un mes|Define CLOUDFLARE_|Analytics Engine respondió HTTP|Respuesta inválida|La API devolvió)/.test(error.message) ? error.message : "No se pudo generar el resumen mensual.");
    process.exitCode = 1;
  }
}

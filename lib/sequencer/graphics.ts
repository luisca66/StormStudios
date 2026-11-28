export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

const escape = (text: string) => text.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));

/** Portable graphics include the exact notation fonts; no remote fonts or raster screenshots. */
export async function exportGraphic(element: HTMLElement, options: {
  title: string; caption: string; aspect: "16:9" | "9:16"; png: boolean;
  /** "grid" (default, v4): measures in a grid of cells. "screen" (v5): measures where they are on screen, so systems,
   *  clefs at line starts and ties over the barline come out exactly as seen. */
  layout?: "grid" | "screen";
}): Promise<Blob> {
  const svgs = [...element.querySelectorAll("svg")];
  if (!svgs.length) throw new Error("La partitura aún no está lista.");
  const response = await fetch("/vendor/sequencer-fonts-v5.json");
  if (!response.ok) throw new Error("No se pudieron cargar las fuentes para exportar.");
  const fonts: Record<string, string> = await response.json();
  const licenses=await Promise.all(["bravura-OFL.txt","academico-OFL.txt"].map(async name=>{
    const result=await fetch("/vendor/"+name);
    if(!result.ok) throw new Error("No se pudo incluir la licencia tipográfica.");
    return result.text();
  }));
  const width = options.aspect === "16:9" ? 1920 : 1080, height = options.aspect === "16:9" ? 1080 : 1920;
  const columns = options.aspect === "16:9" ? 2 : 1, rows = Math.ceil(svgs.length / columns);
  const cellWidth = (width - 140) / columns, available = height - 300;
  const naturalHeight = Math.max(...svgs.map(svg => svg.viewBox.baseVal.height || 200));
  const scale = Math.min((cellWidth - 22) / 620, available / (rows * (naturalHeight + 25)));
  const placed = options.layout === "screen" ? svgs.map(svg => ({ svg, rect: svg.getBoundingClientRect(), view: svg.viewBox.baseVal })).filter(item => item.rect.width > 0 && item.view.width > 0) : [];
  const screen = placed.length ? (() => {
    const left = Math.min(...placed.map(p => p.rect.left)), top = Math.min(...placed.map(p => p.rect.top));
    const right = Math.max(...placed.map(p => p.rect.right)), bottom = Math.max(...placed.map(p => p.rect.bottom));
    const fit = Math.min((width - 140) / (right - left), available / (bottom - top));
    return placed.map(({ svg, rect, view }) => {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.removeAttribute("width"); clone.removeAttribute("height"); clone.removeAttribute("style");
      clone.setAttribute("overflow", "visible"); // a tie over the barline reaches into the next measure
      return '<g transform="translate(' + (70 + (rect.left - left) * fit) + " " + (170 + (rect.top - top) * fit) + ') scale(' + (fit * rect.width / view.width) + ')">'
        + clone.outerHTML.replace("<svg", '<svg width="' + view.width + '" height="' + view.height + '"') + "</g>";
    }).join("");
  })() : null;
  const content = screen ?? svgs.map((svg, index) => {
    const x = 70 + (index % columns) * cellWidth, y = 170 + Math.floor(index / columns) * (naturalHeight + 25) * scale;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("width"); clone.removeAttribute("height");
    clone.removeAttribute("style");
    return '<g transform="translate(' + x + " " + y + ') scale(' + scale + ')">' + clone.outerHTML.replace("<svg", '<svg width="620" height="' + naturalHeight + '"') + "</g>";
  }).join("");
  const css = Object.entries(fonts).map(([name, data]) => "@font-face{font-family:'" + name + "';src:url('" + data + "')}").join("");
  const text = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '">'
    + "<metadata>"+escape(licenses.join("\n\n"))+"</metadata><defs><style>" + css + "</style></defs>"
    + '<rect width="100%" height="100%" fill="#f7faff"/>'
    + '<text x="70" y="85" font-family="Arial" font-size="48" fill="#203454">' + escape(options.title) + "</text>"
    + '<text x="70" y="135" font-family="Arial" font-size="26" fill="#526987">' + escape(options.caption) + "</text>"
    + content + '<text x="70" y="' + (height - 42) + '" font-family="Arial" font-size="22" fill="#667d9b">Storm Studios</text></svg>';
  const svgBlob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
  if (!options.png) return svgBlob;
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("No se pudo convertir a PNG.")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG no disponible.")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

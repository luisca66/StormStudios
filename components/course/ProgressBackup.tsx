"use client";

import { useRef, useState } from "react";
import { parseCourseProgress, readCourseProgress, writeCourseProgress } from "@/lib/course-progress";

export default function ProgressBackup({ locale }: { locale: string }) {
  const es = locale === "es";
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(readCourseProgress(), null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "storm-course-progress.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Too large");
      const imported = parseCourseProgress(await file.text());
      const current = readCourseProgress();
      // Import adds completed lessons; it never erases existing completion.
      for (const [slug, done] of Object.entries(imported.completed)) {
        if (done) current.completed[slug] = true;
      }
      writeCourseProgress(current);
      setMessage(es ? "Progreso importado." : "Progress imported.");
    } catch {
      setMessage(es ? "No se pudo importar. Revisa el archivo y permite el almacenamiento del navegador." : "Import failed. Check the file and allow browser storage.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return <section className="ss-glass rounded-xl p-5 my-8" aria-label={es ? "Respaldo de progreso" : "Progress backup"}>
    <p className="mb-3" style={{ color: "var(--ss-muted)" }}>{es ? "Tus lecciones completadas se guardan en este navegador. Exporta un respaldo para conservarlas o llevarlas a otro dispositivo. El archivo no incluye resultados de las apps." : "Completed lessons are saved in this browser. Export a backup to keep them or move them to another device. App results are not included."}</p>
    <div className="flex flex-wrap gap-4">
      <button className="underline" onClick={download}>{es ? "Exportar progreso" : "Export progress"}</button>
      <button className="underline" onClick={() => input.current?.click()}>{es ? "Importar progreso" : "Import progress"}</button>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" aria-label={es ? "Archivo de progreso" : "Progress file"} onChange={(e) => void restore(e.target.files?.[0])} />
    </div>
    <p role="status" className="mt-2">{message}</p>
  </section>;
}

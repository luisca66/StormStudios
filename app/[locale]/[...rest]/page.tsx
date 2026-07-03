import { notFound } from "next/navigation";

// Catch-all: cualquier ruta que no exista dentro de un locale dispara el
// not-found.tsx localizado (con header/footer) en vez del 404 genérico de Next.
export default function CatchAllPage() {
  notFound();
}

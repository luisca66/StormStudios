// Este archivo existe para satisfacer el type checker de Next.js.
// La raíz canónica del sitio redirige permanentemente a /es.
import { permanentRedirect } from "next/navigation";

export default function RootPage() {
  permanentRedirect("/es");
}

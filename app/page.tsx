// Este archivo existe para satisfacer el type checker de Next.js.
// En producción, el middleware redirige automáticamente a /es o /en.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/es");
}

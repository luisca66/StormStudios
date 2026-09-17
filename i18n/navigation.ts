import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Helpers tipados para navegación interna
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

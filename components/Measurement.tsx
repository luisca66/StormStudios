"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics/client";

export default function Measurement() {
  const pathname = usePathname();
  const params = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Count arrivals and back/forward navigation, not hash/query-only changes
    // or React's development Strict Mode replay.
    const path = window.location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;
    track("page_view");
  }, [pathname, params]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      if (event.type === "auxclick" && event.button !== 1) return;
      const link = event.target.closest<HTMLAnchorElement>("a[data-measure]");
      if (!link) return;
      const destination = link.dataset.destination ?? "";
      if (link.dataset.measure === "amazon_click") track("amazon_click", destination);
      if (link.dataset.measure === "contact_click") track("contact_click", destination);
    };
    // Capture sees next-intl links before client navigation handles the click.
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}

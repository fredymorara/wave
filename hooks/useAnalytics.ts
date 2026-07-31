import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Ignore admin routes
    if (pathname.startsWith("/admin")) return;

    let animeId = undefined;
    
    // Extract animeId if we are on a watch or anime details page
    if (pathname.startsWith("/watch/")) {
      const parts = pathname.split("/");
      if (parts.length >= 3) {
        animeId = parts[2];
      }
    } else if (pathname.startsWith("/anime/")) {
      const parts = pathname.split("/");
      if (parts.length >= 3) {
        animeId = parts[2];
      }
    }

    const payload = JSON.stringify({
      path: pathname,
      animeId
    });

    // We use navigator.sendBeacon for non-blocking tracking that survives page unloads
    // If it's not available, we fall back to fetch with keepalive
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/event", blob);
      } else {
        fetch("/api/analytics/event", {
          method: "POST",
          body: payload,
          headers: {
            "Content-Type": "application/json"
          },
          keepalive: true
        });
      }
    } catch {
      // Silently fail on analytics errors
    }

  }, [pathname]);
}

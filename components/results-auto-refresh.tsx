"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResultsAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [router]);

  return null;
}

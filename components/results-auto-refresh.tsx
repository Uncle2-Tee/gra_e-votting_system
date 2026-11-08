"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResultsAutoRefresh({ live }: { live: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!live) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 10_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [live, router]);

  return null;
}

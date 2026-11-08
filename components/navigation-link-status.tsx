"use client";

import { useLinkStatus } from "next/link";

export default function NavigationLinkStatus() {
  const { pending } = useLinkStatus();

  if (!pending) {
    return null;
  }

  return (
    <span
      aria-label="Loading destination"
      className="ml-auto size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

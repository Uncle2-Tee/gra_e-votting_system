"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export default function SystemWatermark() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 grid place-items-center overflow-hidden"
    >
      <Image
        src="/gra-hotsc-splash.png"
        alt=""
        width={768}
        height={768}
        loading="eager"
        sizes="(max-width: 640px) 68vw, 384px"
        className="size-[min(68vw,17rem)] object-contain opacity-[0.05] sm:size-[min(36vw,24rem)]"
      />
    </div>
  );
}

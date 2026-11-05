import Image from "next/image";

type BrandLogoProps = {
  variant?: "mark" | "lockup";
  className?: string;
  priority?: boolean;
};

const logoAssets = {
  mark: {
    src: "/gra-e-voting-mark.webp",
    width: 490,
    height: 490,
    alt: "Ghana Revenue Authority seal",
  },
  lockup: {
    src: "/gra-e-voting-logo.webp",
    width: 680,
    height: 660,
    alt: "Ghana Revenue Authority HOTSC | GRA logo",
  },
} as const;

export default function BrandLogo({
  variant = "mark",
  className,
  priority = false,
}: BrandLogoProps) {
  const logo = logoAssets[variant];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className={className}
    />
  );
}

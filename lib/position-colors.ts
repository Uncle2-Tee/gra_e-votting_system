import type { CSSProperties } from "react";

const STANDARD_POSITION_HUES: Record<string, number> = {
  president: 216,
  "vice president": 274,
  secretary: 166,
};

function getPositionHue(title: string) {
  const normalizedTitle = title
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
  const standardHue = STANDARD_POSITION_HUES[normalizedTitle];
  if (standardHue !== undefined) {
    return standardHue;
  }

  let hash = 2166136261;
  for (const character of normalizedTitle) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 360;
}

export function getPositionColors(title: string) {
  const hue = getPositionHue(title);
  const accentColor = `hsl(${hue} 70% 44%)`;

  return {
    accent: {
      backgroundImage: `linear-gradient(90deg, hsl(${hue} 72% 40%), hsl(${hue} 76% 57%), hsl(${hue} 84% 84%))`,
    } satisfies CSSProperties,
    accentColor,
    avatar: {
      backgroundColor: `hsl(${hue} 82% 90%)`,
      color: `hsl(${hue} 72% 25%)`,
    } satisfies CSSProperties,
    badge: {
      backgroundColor: `hsl(${hue} 85% 96%)`,
      borderColor: `hsl(${hue} 60% 82%)`,
      color: `hsl(${hue} 72% 28%)`,
    } satisfies CSSProperties,
    radio: {
      accentColor,
    } satisfies CSSProperties,
    selected: {
      backgroundColor: `hsl(${hue} 85% 96%)`,
      borderColor: accentColor,
      boxShadow: `0 0 0 2px hsl(${hue} 70% 44% / 12%)`,
    } satisfies CSSProperties,
    surface: {
      backgroundColor: `hsl(${hue} 80% 98%)`,
      borderColor: `hsl(${hue} 50% 86%)`,
    } satisfies CSSProperties,
    text: {
      color: `hsl(${hue} 72% 28%)`,
    } satisfies CSSProperties,
  };
}

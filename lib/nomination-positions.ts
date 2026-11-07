export const NOMINATION_POSITION_OPTIONS = [
  "President",
  "Vice President",
  "Secretary",
] as const;

export const NOMINATION_POSITION_NAMES: ReadonlySet<string> = new Set(
  NOMINATION_POSITION_OPTIONS,
);

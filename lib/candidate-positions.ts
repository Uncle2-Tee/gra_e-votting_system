export const CANDIDATE_POSITION_OPTIONS: readonly string[] = [];

export const MAX_POSITION_TITLE_LENGTH = 100;

export function hasValidPositionNames(positions: string[]) {
  return (
    positions.length > 0 &&
    positions.every(
      (position) =>
        position.length > 0 && position.length <= MAX_POSITION_TITLE_LENGTH,
    ) &&
    new Set(positions.map((position) => position.toLocaleLowerCase("en"))).size ===
      positions.length
  );
}

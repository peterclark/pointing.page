import type { CSSProperties } from "react";

/** Alternate ink and red down a hand, like suits. */
export function isRedCard(index: number): boolean {
  return index % 2 === 1;
}

/**
 * Places card `index` of `count` in a gentle fan: cards tilt away from the
 * middle and dip slightly towards the ends. Read by the `.fan-card` class.
 */
export function fanStyle(
  index: number,
  count: number,
  { tilt = 1.8, dip = 1.6 }: { tilt?: number; dip?: number } = {}
): CSSProperties {
  const offset = index - (count - 1) / 2;
  return {
    "--rot": `${(offset * tilt).toFixed(1)}deg`,
    "--arc": `${Math.round(offset * offset * dip)}px`,
    zIndex: index,
  } as CSSProperties;
}

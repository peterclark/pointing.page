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

/** Classes for a text field on the felt, matching the landing page's code input */
export const feltField =
  "rounded-2xl border-2 border-ivory/30 bg-felt-deep/40 px-4 text-base text-ivory placeholder:text-ivory/50";

/** Classes for the main ivory call-to-action button */
export const ivoryButton =
  "h-14 rounded-2xl bg-ivory text-lg font-extrabold text-ink hover:bg-ivory/90";

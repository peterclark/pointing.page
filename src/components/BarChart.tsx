import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Bar {
  /** Axis label, also used in the readout and the table. */
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  bars: Bar[];
  /** Readout for one bar, e.g. "Oct 22: 3 rooms". */
  describe: (bar: Bar) => string;
  /** Indexes whose labels are printed under the axis. Defaults to first and last. */
  ticks?: number[];
  /** Bar drawn in gold, such as today. */
  highlight?: number;
  className?: string;
}

/**
 * A single-series column chart on the felt: ivory bars on a dark panel.
 *
 * Hovering a bar shows its value in the readout under the title, which
 * otherwise sums the whole chart. A visually hidden table carries the same
 * numbers for screen readers.
 */
export function BarChart({
  title,
  bars,
  describe,
  ticks = [0, bars.length - 1],
  highlight,
  className,
}: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((sum, b) => sum + b.value, 0);

  return (
    <figure
      className={cn("rounded-2xl bg-felt-deep/50 p-4 sm:p-5", className)}
      onMouseLeave={() => setHovered(null)}
    >
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-card font-bold text-ivory">{title}</span>
        <span className="text-sm text-ivory/70 tabular-nums" aria-live="polite">
          {hovered === null ? `${total} total` : describe(bars[hovered])}
        </span>
      </figcaption>

      <div className="relative mt-4" aria-hidden="true">
        <span className="absolute -top-1 left-0 text-[11px] leading-none text-ivory/50 tabular-nums">
          {max}
        </span>
        <div className="flex h-32 items-end gap-[2px] border-b border-ivory/25 pt-4">
          {bars.map((bar, i) => (
            <div
              key={bar.label}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setHovered(i)}
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-colors",
                  i === highlight ? "bg-gold" : "bg-ivory/85",
                  hovered !== null && hovered !== i && "opacity-50"
                )}
                style={{
                  height: bar.value ? `${(bar.value / max) * 100}%` : 0,
                  minHeight: bar.value ? 3 : 0,
                }}
              />
            </div>
          ))}
        </div>
        <div className="relative mt-1.5 h-4 text-[11px] text-ivory/60">
          {ticks.map((i) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={tickPosition(i, bars.length)}
            >
              {bars[i]?.label}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.label}>
              <th scope="row">{bar.label}</th>
              <td>{bar.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Centres a tick under its bar, pinning the first and last to the edges. */
function tickPosition(index: number, count: number): React.CSSProperties {
  if (index === 0) return { left: 0 };
  if (index === count - 1) return { right: 0 };
  return { left: `${((index + 0.5) / count) * 100}%`, transform: "translateX(-50%)" };
}

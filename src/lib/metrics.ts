import type { Bar } from "@/components/BarChart";
import type { AdminMetrics } from "@/lib/supabase/admin";

/** One bar per headcount from 1 to 10+, filling in sizes nobody hit. */
export function roomSizeBars(sizes: AdminMetrics["room_sizes"]): Bar[] {
  return Array.from({ length: 10 }, (_, i) => {
    const size = i + 1;
    return {
      label: size === 10 ? "10+" : String(size),
      value: sizes?.find((s) => s.size === size)?.rooms ?? 0,
    };
  });
}

/** Rotates the UTC hours into the viewer's time zone, midnight first. */
export function localHourBars(
  hours: AdminMetrics["hours"],
  offsetMinutes = new Date().getTimezoneOffset()
): Bar[] {
  const shift = Math.round(-offsetMinutes / 60);
  const byLocal = new Array<number>(24).fill(0);
  for (const { hour, events } of hours) {
    byLocal[(((hour + shift) % 24) + 24) % 24] += events;
  }
  return byLocal.map((value, hour) => ({ label: hourLabel(hour), value }));
}

function hourLabel(hour: number) {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

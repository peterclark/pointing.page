/**
 * AdminPage Component
 *
 * Usage across every room, for admins only. Access is decided by the database:
 * `admin_metrics()` refuses anyone not in the `admins` table, and this page
 * asks `is_admin()` first only so it can say so instead of showing an error.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { useCardTable } from "@/hooks/useCardTable";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getAdminMetrics, type AdminMetrics } from "@/lib/supabase/admin";
import { BarChart, type Bar } from "@/components/BarChart";
import { cn } from "@/lib/utils";
import { localHourBars, roomSizeBars } from "@/lib/metrics";

const WINDOWS = [7, 30, 90] as const;

export function AdminPage() {
  useCardTable();
  const { isAdmin, isLoading: checking } = useIsAdmin();
  const [days, setDays] = useState<number>(30);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetrics(await getAdminMetrics(days));
      setError(null);
    } catch (err) {
      console.error("[AdminPage]", err);
      setError("Couldn't load the numbers. Try again.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-4 pb-12 sm:px-6">
      <p className="font-display flex h-11 items-center justify-center text-2xl">
        Pointing<span className="text-suit">.</span>page
      </p>

      <main className="mx-auto mt-6 w-full max-w-5xl flex-1">
        {checking ? (
          <p className="text-center text-ivory/70">Checking access…</p>
        ) : !isAdmin ? (
          <NotAllowed />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-[2.5rem] leading-none sm:text-5xl">
                  The house
                </h1>
                <p className="mt-2 text-ivory/70">
                  {metrics
                    ? `Updated ${new Date(metrics.generated_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "Every room, every player"}
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 rounded-full border-2 border-ivory/30 px-4 py-2 text-sm font-bold text-ivory hover:border-ivory/60 disabled:opacity-60"
              >
                <RotateCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>

            {error && <p className="mt-6 text-gold">{error}</p>}
            {metrics && (
              <Dashboard metrics={metrics} days={days} onDaysChange={setDays} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NotAllowed() {
  return (
    <div className="mx-auto max-w-[420px] space-y-4 pt-16 text-center">
      <h1 className="font-display text-4xl">Staff only</h1>
      <p className="text-ivory/75">This page is for the people who run the table.</p>
      <Link to="/" className="inline-block font-bold text-gold underline-offset-4 hover:underline">
        Back to the lobby
      </Link>
    </div>
  );
}

function Dashboard({
  metrics: m,
  days,
  onDaysChange,
}: {
  metrics: AdminMetrics;
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const users = m.users.anonymous + m.users.registered;
  const pct = (part: number, whole: number) =>
    whole ? `${Math.round((part / whole) * 100)}%` : "–";

  const daily = (key: "rooms" | "stories"): Bar[] =>
    m.daily.map((d) => ({ label: shortDate(d.day), value: d[key] }));
  const dailyTicks = [0, Math.floor((m.daily.length - 1) / 2), m.daily.length - 1];

  return (
    <div className="mt-8 space-y-10">
      {/* The three numbers asked for, dealt as cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <HeadlineCard
          label="Users"
          value={users}
          detail={`${m.users.anonymous} guests · ${m.users.registered} signed in`}
          pip="♠"
        />
        <HeadlineCard
          label="Rooms created"
          value={m.rooms.total}
          detail={`${m.rooms.last_7d} in the last 7 days`}
          pip="♥"
          red
        />
        <HeadlineCard
          label="People per room"
          value={m.rooms.avg_people ?? "–"}
          detail={`${m.rooms.solo} solo · largest ${m.rooms.max_people}`}
          pip="♣"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active rooms, 24h" value={m.rooms.active_24h} />
        <Stat
          label="Rooms that pointed a story"
          value={m.rooms.pointed}
          detail={pct(m.rooms.pointed, m.rooms.total)}
        />
        <Stat
          label="Stories pointed"
          value={m.stories.revealed}
          detail={`of ${m.stories.total} created`}
        />
        <Stat label="Votes per story" value={m.stories.avg_votes ?? "–"} />
        <Stat label="Votes cast" value={m.stories.votes} />
        <Stat
          label="Returning people"
          value={m.users.returning}
          detail="joined 2+ rooms"
        />
        <Stat label="New users, 7 days" value={m.users.new_7d} />
        <Stat
          label="Signed in"
          value={pct(m.users.registered, users)}
          detail="of all users"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Over time</h2>
          <div role="group" aria-label="Time window" className="flex gap-1 rounded-full bg-felt-deep/50 p-1">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={days === w}
                onClick={() => onDaysChange(w)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-bold",
                  days === w ? "bg-ivory text-ink" : "text-ivory/75 hover:text-ivory"
                )}
              >
                {w} days
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BarChart
            title="Rooms created per day"
            bars={daily("rooms")}
            ticks={dailyTicks}
            highlight={m.daily.length - 1}
            describe={(b) => `${b.label}: ${plural(b.value, "room")}`}
          />
          <BarChart
            title="Stories pointed per day"
            bars={daily("stories")}
            ticks={dailyTicks}
            highlight={m.daily.length - 1}
            describe={(b) => `${b.label}: ${plural(b.value, "story", "stories")}`}
          />
          <BarChart
            title="Room size"
            bars={roomSizeBars(m.room_sizes)}
            ticks={[0, 4, 9]}
            describe={(b) => `${plural(b.value, "room")} with ${b.label} ${b.label === "1" ? "person" : "people"}`}
          />
          <BarChart
            title="Busiest hours (your time)"
            bars={localHourBars(m.hours)}
            ticks={[0, 6, 12, 18, 23]}
            describe={(b) => `${b.label}: ${plural(b.value, "action")}`}
          />
        </div>
        <p className="text-sm text-ivory/60">
          Today is in gold. Busiest hours counts joins, new stories and votes in the
          window. Room size counts everyone who ever sat in the room.
        </p>
      </section>

      <ScaleSplit fibonacci={m.rooms.fibonacci} tShirt={m.rooms.t_shirt} />
    </div>
  );
}

function HeadlineCard({
  label,
  value,
  detail,
  pip,
  red = false,
}: {
  label: string;
  value: number | string;
  detail: string;
  pip: string;
  red?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-ivory px-5 pt-4 pb-5 font-card shadow-[-4px_6px_14px_rgba(0,0,0,0.35)]",
        red ? "text-suit" : "text-ink"
      )}
    >
      <span aria-hidden="true" className="absolute top-3 right-4 text-xl leading-none">
        {pip}
      </span>
      <p className="text-sm font-bold text-ink/70">{label}</p>
      <p className="font-display mt-1 text-6xl leading-none tabular-nums">{value}</p>
      <p className="mt-3 text-sm text-ink/70">{detail}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-ivory/15 bg-felt-deep/40 px-4 py-3">
      <p className="text-sm text-ivory/70">{label}</p>
      <p className="mt-1 font-card text-3xl font-extrabold tabular-nums text-ivory">
        {value}
        {detail && (
          <span className="ml-2 text-sm font-normal text-ivory/60">{detail}</span>
        )}
      </p>
    </div>
  );
}

function ScaleSplit({ fibonacci, tShirt }: { fibonacci: number; tShirt: number }) {
  const total = fibonacci + tShirt;
  if (!total) return null;
  const fibShare = Math.round((fibonacci / total) * 100);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-3xl">Point scale</h2>
      <div className="flex h-10 gap-[2px] overflow-hidden rounded-xl" aria-hidden="true">
        {fibonacci > 0 && <div className="bg-ivory" style={{ flexGrow: fibonacci }} />}
        {tShirt > 0 && <div className="bg-suit" style={{ flexGrow: tShirt }} />}
      </div>
      <div className="flex justify-between text-sm text-ivory/80">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-ivory" aria-hidden="true" />
          Fibonacci {fibonacci} ({fibShare}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-suit" aria-hidden="true" />
          T-shirt {tShirt} ({100 - fibShare}%)
        </span>
      </div>
    </section>
  );
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2026-10-22" → "Oct 22", read as a UTC calendar day. */
function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

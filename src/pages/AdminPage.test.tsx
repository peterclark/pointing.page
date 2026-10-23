import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdminPage } from "./AdminPage";
import type { AdminMetrics } from "@/lib/supabase/admin";
import { localHourBars, roomSizeBars } from "@/lib/metrics";

const mocks = vi.hoisted(() => ({
  useIsAdmin: vi.fn(),
  getAdminMetrics: vi.fn(),
}));

vi.mock("@/hooks/useIsAdmin", () => ({ useIsAdmin: mocks.useIsAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminMetrics: mocks.getAdminMetrics }));

const metrics: AdminMetrics = {
  generated_at: "2026-10-23T14:00:00Z",
  users: { anonymous: 55, registered: 1, new_7d: 12, returning: 3 },
  rooms: {
    total: 53,
    last_7d: 6,
    active_24h: 5,
    pointed: 26,
    avg_people: 1.3,
    solo: 36,
    max_people: 3,
    fibonacci: 38,
    t_shirt: 15,
  },
  stories: { total: 51, revealed: 29, votes: 59, avg_votes: 1.5 },
  daily: [
    { day: "2026-10-22", rooms: 2, stories: 22, people: 2 },
    { day: "2026-10-23", rooms: 3, stories: 7, people: 4 },
  ],
  room_sizes: [
    { size: 1, rooms: 36 },
    { size: 2, rooms: 16 },
    { size: 3, rooms: 1 },
  ],
  hours: Array.from({ length: 24 }, (_, hour) => ({ hour, events: hour === 14 ? 14 : 0 })),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );

describe("AdminPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("turns away anyone who is not an admin without asking for metrics", () => {
    mocks.useIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    renderPage();

    expect(screen.getByText("Staff only")).toBeInTheDocument();
    expect(mocks.getAdminMetrics).not.toHaveBeenCalled();
  });

  it("shows users split by kind, rooms and people per room", async () => {
    mocks.useIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    mocks.getAdminMetrics.mockResolvedValue(metrics);
    renderPage();

    expect(await screen.findByText("56")).toBeInTheDocument();
    expect(screen.getByText("55 guests · 1 signed in")).toBeInTheDocument();
    expect(screen.getByText("53")).toBeInTheDocument();
    expect(screen.getByText("1.3")).toBeInTheDocument();
    expect(mocks.getAdminMetrics).toHaveBeenCalledWith(30);
  });

  it("reloads for a different time window", async () => {
    mocks.useIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    mocks.getAdminMetrics.mockResolvedValue(metrics);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
    expect(mocks.getAdminMetrics).toHaveBeenLastCalledWith(7);
  });
});

describe("chart data", () => {
  it("fills every room size from 1 to 10+", () => {
    const bars = roomSizeBars(metrics.room_sizes);
    expect(bars.map((b) => b.label)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"]);
    expect(bars.map((b) => b.value).slice(0, 4)).toEqual([36, 16, 1, 0]);
    expect(roomSizeBars(null).every((b) => b.value === 0)).toBe(true);
  });

  it("moves UTC hours into the viewer's time zone", () => {
    // UTC-4 (getTimezoneOffset reports +240): 14:00 UTC is 10am.
    const bars = localHourBars(metrics.hours, 240);
    expect(bars[10]).toEqual({ label: "10am", value: 14 });
    expect(bars[0].label).toBe("12am");
  });
});

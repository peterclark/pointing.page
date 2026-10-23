import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecentRoomsMenuItems } from "./RecentRoomsMenuItems";
import { getRecentRooms } from "@/lib/supabase/queries";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@/lib/supabase/queries", () => ({ getRecentRooms: vi.fn() }));

function renderOpen(userId?: string) {
  return render(
    <DropdownMenu open>
      <DropdownMenuTrigger>menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <RecentRoomsMenuItems userId={userId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("RecentRoomsMenuItems", () => {
  beforeEach(() => vi.resetAllMocks());

  it("lists recent rooms and opens one when clicked", async () => {
    vi.mocked(getRecentRooms).mockResolvedValue([
      { room_code: "ABCD1234", name: "Sprint 12", is_leader: true, joined_at: "x" },
      { room_code: "WXYZ9876", name: "Backlog", is_leader: false, joined_at: "y" },
    ]);
    renderOpen("user-1");

    const item = await screen.findByRole("menuitem", { name: /Sprint 12/ });
    expect(screen.getByText("ABCD-1234")).toBeInTheDocument();
    expect(screen.getByLabelText("You lead this room")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Backlog/ })).toBeInTheDocument();

    await userEvent.click(item);
    expect(navigate).toHaveBeenCalledWith("/room/ABCD1234");
  });

  it("says so when the user has no rooms", async () => {
    vi.mocked(getRecentRooms).mockResolvedValue([]);
    renderOpen("user-1");

    expect(await screen.findByText("No rooms yet")).toBeInTheDocument();
  });

  it("shows an error item when loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getRecentRooms).mockRejectedValue(new Error("down"));
    renderOpen("user-1");

    expect(await screen.findByText("Couldn't load your rooms")).toBeInTheDocument();
  });

  it("waits for a session before fetching", () => {
    renderOpen(undefined);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(getRecentRooms).not.toHaveBeenCalled();
  });
});

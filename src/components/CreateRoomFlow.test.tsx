/**
 * Tests for CreateRoomFlow
 *
 * The menu's New Room item only flips a flag in the command palette context,
 * so the dialog must be mounted on every page, not just the landing page.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreateRoomFlow } from "./CreateRoomFlow";
import { CommandPaletteProvider } from "@/contexts/CommandPaletteContext";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { mockAuthState } from "@/tests/mock-auth";

vi.mock("@/hooks/useAuth");
vi.mock("@/lib/supabase/queries");

function NewRoomMenuItem() {
  const { openCreateRoomDialog } = useCommandPalette();
  return <button onClick={() => openCreateRoomDialog()}>New Room</button>;
}

describe("CreateRoomFlow", () => {
  it("opens the create room dialog away from the landing page", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthState({ userId: "user-123" }));

    render(
      <CommandPaletteProvider>
        <MemoryRouter initialEntries={["/room/ABCD1234"]}>
          <NewRoomMenuItem />
          <CreateRoomFlow />
        </MemoryRouter>
      </CommandPaletteProvider>
    );

    expect(screen.queryByText("Create a Room")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New Room" }));
    expect(screen.getByText("Create a Room")).toBeInTheDocument();
  });
});

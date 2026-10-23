import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "./LandingPage";
import { CommandPaletteProvider } from "@/contexts/CommandPaletteContext";
import { CreateRoomFlow } from "@/components/CreateRoomFlow";

// Mock the CreateRoomDialog component
vi.mock("@/components/CreateRoomDialog", () => ({
  CreateRoomDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="create-room-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close Dialog</button>
    </div>
  ),
}));

// Helper to render LandingPage with the create room flow RootLayout provides
function renderLandingPage() {
  return render(
    <CommandPaletteProvider>
      <MemoryRouter>
        <LandingPage />
        <CreateRoomFlow />
      </MemoryRouter>
    </CommandPaletteProvider>
  );
}

describe("LandingPage", () => {
  it("joins a room by code, accepting the dashed display format", () => {
    render(
      <CommandPaletteProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/join/:roomCode" element={<p>joining</p>} />
          </Routes>
        </MemoryRouter>
      </CommandPaletteProvider>
    );

    const join = screen.getByRole("button", { name: /^join$/i });
    const input = screen.getByLabelText(/room code/i);

    fireEvent.change(input, { target: { value: "abc" } });
    expect(join).toBeDisabled();

    fireEvent.change(input, { target: { value: "abcd-1234" } });
    fireEvent.click(join);

    expect(screen.getByText("joining")).toBeInTheDocument();
  });

  it("renders deal a new room button", () => {
    renderLandingPage();
    expect(
      screen.getByRole("button", { name: /deal a new room/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when deal a new room is clicked", () => {
    renderLandingPage();

    const dealButton = screen.getByRole("button", { name: /deal a new room/i });
    fireEvent.click(dealButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
  });

  it("closes dialog when onOpenChange is called with false", () => {
    renderLandingPage();

    // Open dialog
    const dealButton = screen.getByRole("button", { name: /deal a new room/i });
    fireEvent.click(dealButton);

    // Close dialog
    const closeButton = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });
});

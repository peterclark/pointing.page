import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LandingPage } from "./LandingPage";

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

describe("LandingPage", () => {
  it("renders create room button", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("button", { name: /create room/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when create room button is clicked", () => {
    render(<LandingPage />);

    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
  });

  it("closes dialog when onOpenChange is called with false", () => {
    render(<LandingPage />);

    // Open dialog
    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    // Close dialog
    const closeButton = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });
});

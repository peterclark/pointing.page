import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

// Mock the WavyBackground component (uses canvas which doesn't work in jsdom)
vi.mock("@/components/ui/wavy-background", () => ({
  WavyBackground: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="wavy-background" className={className}>
      {children}
    </div>
  ),
}));

// Mock the TypewriterEffectSmooth component
vi.mock("@/components/ui/typewriter-effect", () => ({
  TypewriterEffectSmooth: ({ words }: { words: Array<{ text: string; className?: string }> }) => (
    <div data-testid="typewriter-effect">
      {words.map((word, idx) => (
        <span key={idx} className={word.className}>
          {word.text}{" "}
        </span>
      ))}
    </div>
  ),
}));

// Helper to render LandingPage with Router
function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  it("renders enter button", () => {
    renderLandingPage();
    expect(
      screen.getByRole("button", { name: /enter/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when enter button is clicked", () => {
    renderLandingPage();

    const enterButton = screen.getByRole("button", { name: /enter/i });
    fireEvent.click(enterButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
  });

  it("closes dialog when onOpenChange is called with false", () => {
    renderLandingPage();

    // Open dialog
    const enterButton = screen.getByRole("button", { name: /enter/i });
    fireEvent.click(enterButton);

    // Close dialog
    const closeButton = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeButton);

    const dialog = screen.getByTestId("create-room-dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });
});

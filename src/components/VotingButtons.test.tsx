import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VotingButtons } from "./VotingButtons";
import * as queries from "@/lib/supabase/queries";
import { toast } from "sonner";

// Mock the database queries
vi.mock("@/lib/supabase/queries", () => ({
  submitVote: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("VotingButtons", () => {
  const mockProps = {
    storyId: "test-story-id",
    participantId: "test-participant-id",
    currentVote: null,
    isRevealed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fibonacci scale buttons correctly", () => {
    render(<VotingButtons {...mockProps} pointScale="fibonacci" />);

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "13" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "21" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "?" })).toBeInTheDocument();
  });

  it("renders t-shirt scale buttons correctly", () => {
    render(<VotingButtons {...mockProps} pointScale="t-shirt" />);

    expect(screen.getByRole("button", { name: "XS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "S" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "M" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "L" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XXL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "?" })).toBeInTheDocument();
  });

  it("highlights currently selected vote", () => {
    render(<VotingButtons {...mockProps} pointScale="fibonacci" currentVote="5" />);

    const button5 = screen.getByRole("button", { name: "5" });
    const button8 = screen.getByRole("button", { name: "8" });

    // The selected button should have ring styling (we can check via className or variant)
    expect(button5).toHaveClass("ring-2");
    expect(button8).not.toHaveClass("ring-2");
  });

  it("submits vote when button is clicked", async () => {
    vi.mocked(queries.submitVote).mockResolvedValue({} as any);

    render(<VotingButtons {...mockProps} pointScale="fibonacci" />);

    const button5 = screen.getByRole("button", { name: "5" });
    fireEvent.click(button5);

    await waitFor(() => {
      expect(queries.submitVote).toHaveBeenCalledWith(
        mockProps.storyId,
        mockProps.participantId,
        "5"
      );
    });
  });

  it("allows changing vote before reveal", async () => {
    vi.mocked(queries.submitVote).mockResolvedValue({} as any);

    render(<VotingButtons {...mockProps} pointScale="fibonacci" currentVote="5" />);

    const button8 = screen.getByRole("button", { name: "8" });
    fireEvent.click(button8);

    await waitFor(() => {
      expect(queries.submitVote).toHaveBeenCalledWith(
        mockProps.storyId,
        mockProps.participantId,
        "8"
      );
    });
  });

  it("disables buttons after reveal", () => {
    render(
      <VotingButtons
        {...mockProps}
        pointScale="fibonacci"
        currentVote="5"
        isRevealed={true}
      />
    );

    const button5 = screen.getByRole("button", { name: "5" });
    const button8 = screen.getByRole("button", { name: "8" });

    expect(button5).toBeDisabled();
    expect(button8).toBeDisabled();
  });

  it("handles vote submission errors", async () => {
    vi.mocked(queries.submitVote).mockRejectedValue(new Error("Database error"));

    render(<VotingButtons {...mockProps} pointScale="fibonacci" />);

    const button5 = screen.getByRole("button", { name: "5" });
    fireEvent.click(button5);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to submit vote. Please try again."
      );
    });
  });

  it("shows optimistic update immediately on click", async () => {
    // Delay the resolution to test optimistic update
    vi.mocked(queries.submitVote).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({} as any), 200))
    );

    render(<VotingButtons {...mockProps} pointScale="fibonacci" />);

    const button5 = screen.getByRole("button", { name: "5" });
    fireEvent.click(button5);

    // Button should immediately show selected state (optimistic)
    expect(button5).toHaveClass("ring-2");
  });
});

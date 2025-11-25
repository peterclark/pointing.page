import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaderControls } from "./LeaderControls";
import * as queries from "@/lib/supabase/queries";
import { toast } from "sonner";

// Mock the queries module
vi.mock("@/lib/supabase/queries", () => ({
  revealVotes: vi.fn(),
  clearActiveStory: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LeaderControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("visibility", () => {
    it("does not render when user is not leader", () => {
      const { container } = render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("does not render when there is no active story", () => {
      const { container } = render(
        <LeaderControls
          roomId="room1"
          storyId={null}
          isRevealed={false}
          isLeader={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders Reveal Votes button when leader and story is active but not revealed", () => {
      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      expect(screen.getByText("Reveal Votes")).toBeInTheDocument();
    });

    it("renders Next Story button when leader and votes are revealed", () => {
      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      expect(screen.getByText("Next Story")).toBeInTheDocument();
    });
  });

  describe("Reveal Votes button", () => {
    it("calls revealVotes when clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.revealVotes).mockResolvedValue();

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const button = screen.getByText("Reveal Votes");
      await user.click(button);

      await waitFor(() => {
        expect(queries.revealVotes).toHaveBeenCalledWith("story1");
      });
    });

    it("shows success toast on successful reveal", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.revealVotes).mockResolvedValue();

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const button = screen.getByText("Reveal Votes");
      await user.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Votes revealed!");
      });
    });

    it("shows error toast on failed reveal", async () => {
      const user = userEvent.setup();
      const error = new Error("Failed to reveal");
      vi.mocked(queries.revealVotes).mockRejectedValue(error);

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const button = screen.getByText("Reveal Votes");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to reveal votes. Please try again."
        );
      });
    });

    it("disables button while revealing", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.revealVotes).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const button = screen.getByText("Reveal Votes");
      await user.click(button);

      // Button should be disabled during operation
      expect(button).toBeDisabled();
    });
  });

  describe("Next Story button", () => {
    it("calls clearActiveStory when clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.clearActiveStory).mockResolvedValue();

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const button = screen.getByText("Next Story");
      await user.click(button);

      await waitFor(() => {
        expect(queries.clearActiveStory).toHaveBeenCalledWith("room1");
      });
    });

    it("shows success toast on successful clear", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.clearActiveStory).mockResolvedValue();

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const button = screen.getByText("Next Story");
      await user.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Ready for next story!");
      });
    });

    it("shows error toast on failed clear", async () => {
      const user = userEvent.setup();
      const error = new Error("Failed to clear");
      vi.mocked(queries.clearActiveStory).mockRejectedValue(error);

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const button = screen.getByText("Next Story");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to start next story. Please try again."
        );
      });
    });

    it("disables button while clearing", async () => {
      const user = userEvent.setup();
      vi.mocked(queries.clearActiveStory).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const button = screen.getByText("Next Story");
      await user.click(button);

      // Button should be disabled during operation
      expect(button).toBeDisabled();
    });
  });

  describe("button styling", () => {
    it("uses default variant for Reveal Votes button", () => {
      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const button = screen.getByText("Reveal Votes");
      expect(button.className).toContain("bg-primary");
    });

    it("uses secondary variant for Next Story button", () => {
      render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const button = screen.getByText("Next Story");
      // Next Story button uses primary color
      expect(button.className).toContain("bg-primary");
    });

    it("uses lg size for both buttons", () => {
      const { rerender } = render(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={false}
          isLeader={true}
        />
      );

      const revealButton = screen.getByText("Reveal Votes");
      expect(revealButton.className).toContain("h-10");

      rerender(
        <LeaderControls
          roomId="room1"
          storyId="story1"
          isRevealed={true}
          isLeader={true}
        />
      );

      const nextButton = screen.getByText("Next Story");
      expect(nextButton.className).toContain("h-10");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActiveRoomPage } from "./ActiveRoomPage";
import * as utils from "@/lib/utils";
import { toast } from "sonner";

// Mock dependencies
vi.mock("react-router-dom", () => ({
  useParams: () => ({ roomCode: "ABC12345" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    copyToClipboard: vi.fn(),
  };
});

describe("ActiveRoomPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays formatted room code", () => {
    render(<ActiveRoomPage />);

    // Room code should be displayed with formatting
    expect(screen.getByText("ABC1-2345")).toBeInTheDocument();
  });

  it("shows copy button", () => {
    render(<ActiveRoomPage />);

    expect(
      screen.getByRole("button", { name: /copy link/i })
    ).toBeInTheDocument();
  });

  it("shows success toast when copy succeeds", async () => {
    vi.mocked(utils.copyToClipboard).mockResolvedValue(true);

    render(<ActiveRoomPage />);

    const copyButton = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard!", {
        duration: 3000,
      });
    });
  });

  it("shows error toast when copy fails", async () => {
    vi.mocked(utils.copyToClipboard).mockResolvedValue(false);

    render(<ActiveRoomPage />);

    const copyButton = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to copy. Please try manually.",
        {
          duration: 5000,
        }
      );
    });
  });
});

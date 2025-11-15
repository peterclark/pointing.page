import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StoryForm } from "./StoryForm";
import * as queries from "@/lib/supabase/queries";
import { toast } from "sonner";

// Mock the database queries
vi.mock("@/lib/supabase/queries", () => ({
  createStory: vi.fn(),
  setActiveStory: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StoryForm", () => {
  const mockRoomId = "test-room-id";
  const mockOnStoryCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields correctly", () => {
    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    expect(screen.getByLabelText(/story title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start voting/i })).toBeInTheDocument();
  });

  it("validates required title field", async () => {
    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    expect(queries.createStory).not.toHaveBeenCalled();
  });

  it("submits form with title only", async () => {
    const mockStory = { id: "story-1", title: "Test Story", room_id: mockRoomId };
    vi.mocked(queries.createStory).mockResolvedValue(mockStory as any);
    vi.mocked(queries.setActiveStory).mockResolvedValue(mockStory as any);

    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const titleInput = screen.getByLabelText(/story title/i);
    fireEvent.change(titleInput, { target: { value: "Test Story" } });

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(queries.createStory).toHaveBeenCalledWith(mockRoomId, "Test Story", "");
      expect(queries.setActiveStory).toHaveBeenCalledWith("story-1");
      expect(toast.success).toHaveBeenCalledWith("Story created! Voting has started.");
      expect(mockOnStoryCreated).toHaveBeenCalled();
    });
  });

  it("submits form with title and description", async () => {
    const mockStory = { id: "story-1", title: "Test Story", room_id: mockRoomId };
    vi.mocked(queries.createStory).mockResolvedValue(mockStory as any);
    vi.mocked(queries.setActiveStory).mockResolvedValue(mockStory as any);

    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const titleInput = screen.getByLabelText(/story title/i);
    fireEvent.change(titleInput, { target: { value: "Test Story" } });

    const descriptionInput = screen.getByLabelText(/description \(optional\)/i);
    fireEvent.change(descriptionInput, { target: { value: "Test description" } });

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(queries.createStory).toHaveBeenCalledWith(
        mockRoomId,
        "Test Story",
        "Test description"
      );
    });
  });

  it("disables form during submission", async () => {
    const mockStory = { id: "story-1", title: "Test Story", room_id: mockRoomId };
    vi.mocked(queries.createStory).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockStory as any), 100))
    );

    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const titleInput = screen.getByLabelText(/story title/i);
    fireEvent.change(titleInput, { target: { value: "Test Story" } });

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
  });

  it("handles submission errors gracefully", async () => {
    vi.mocked(queries.createStory).mockRejectedValue(new Error("Database error"));

    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const titleInput = screen.getByLabelText(/story title/i);
    fireEvent.change(titleInput, { target: { value: "Test Story" } });

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to create story. Please try again."
      );
      expect(mockOnStoryCreated).not.toHaveBeenCalled();
    });
  });

  it("clears form after successful submission", async () => {
    const mockStory = { id: "story-1", title: "Test Story", room_id: mockRoomId };
    vi.mocked(queries.createStory).mockResolvedValue(mockStory as any);
    vi.mocked(queries.setActiveStory).mockResolvedValue(mockStory as any);

    render(<StoryForm roomId={mockRoomId} onStoryCreated={mockOnStoryCreated} />);

    const titleInput = screen.getByLabelText(/story title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Test Story" } });

    const submitButton = screen.getByRole("button", { name: /start voting/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(titleInput.value).toBe("");
    });
  });
});

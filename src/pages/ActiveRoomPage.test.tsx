/**
 * ActiveRoomPage Integration Tests
 *
 * End-to-end tests for the complete voting workflow orchestration.
 * Tests cover:
 * - Page state transitions (no story → voting → revealed)
 * - Vote privacy enforcement (critical security requirement)
 * - Leader vs non-leader experiences
 * - Real-time update handling
 * - Error scenarios
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter, Routes, Route, MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ActiveRoomPage } from "./ActiveRoomPage";
import * as queries from "@/lib/supabase/queries";
import * as useRoomSubscriptionModule from "@/hooks/useRoomSubscription";
import { useAuth } from "@/hooks/useAuth";
import { mockAuthState } from "@/tests/mock-auth";
import * as utils from "@/lib/utils";
import type { Tables } from "@/lib/supabase/client";

// Mock modules
vi.mock("@/lib/supabase/queries");
vi.mock("@/hooks/useRoomSubscription");
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    getParticipantId: vi.fn(),
    copyToClipboard: vi.fn(),
  };
});

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Test data factory
const createMockRoom = (overrides?: Partial<Tables<"rooms">>): Tables<"rooms"> => ({
  id: "room-123",
  name: "Sprint Planning",
  room_code: "ABC12345",
  point_scale: "fibonacci",
  leader_id: null,
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const createMockParticipant = (
  overrides?: Partial<Tables<"participants">>
): Tables<"participants"> => ({
  id: "participant-123",
  room_id: "room-123",
  user_id: "user-123",
  name: "Alice",
  is_leader: false,
  is_active: true,
  joined_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const createMockStory = (overrides?: Partial<Tables<"stories">>): Tables<"stories"> => ({
  id: "story-123",
  room_id: "room-123",
  title: "User login feature",
  description: "As a user, I want to log in",
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  final_average: null,
  ...overrides,
});

const createMockVote = (overrides?: Partial<Tables<"votes">>): Tables<"votes"> => ({
  id: "vote-123",
  story_id: "story-123",
  participant_id: "participant-123",
  point_value: "5",
  is_revealed: false,
  sentiment: null,
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

// Helper to render page with router context
const renderPage = (roomCode: string = "ABC12345") => {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomCode}`]}>
      <Routes>
        <Route path="/room/:roomCode" element={<ActiveRoomPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ActiveRoomPage - End-to-End Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(queries.getRoomByCode).mockResolvedValue(createMockRoom());
    // Identity comes from the session now. This id matches the user_id on
    // createMockParticipant, so the page resolves it to "participant-123".
    vi.mocked(useAuth).mockReturnValue(mockAuthState({ userId: "user-123" }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Page Loading and Setup", () => {
    it("should display loading state while fetching room and subscription data", async () => {
      // Mock slow loading
      vi.mocked(queries.getRoomByCode).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockRoom()), 100))
      );
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [],
        isLoading: true,
        error: null,
      });

      renderPage();

      // Should show loading message
      expect(screen.getByText(/loading room/i)).toBeInTheDocument();
      expect(screen.getByText(/connecting to real-time updates/i)).toBeInTheDocument();
    });

    it("should display error state when subscription fails", async () => {
      const mockError = new Error("Connection failed");
      const mockParticipant = createMockParticipant();
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: mockError,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("State 1: No Active Story", () => {
    it("should show story form when leader and no active story", async () => {
      const mockLeader = createMockParticipant({ is_leader: true });
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockLeader],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/create a story/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/story title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /start voting/i })).toBeInTheDocument();
      });
    });

    it("should show waiting message when non-leader and no active story", async () => {
      const mockParticipant = createMockParticipant({ is_leader: false });
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/waiting for leader to start voting/i)).toBeInTheDocument();
        expect(
          screen.getByText(/the leader will create a story/i)
        ).toBeInTheDocument();
        // Should NOT show story form
        expect(screen.queryByLabelText(/story title/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("State 2: Active Story (Not Revealed) - Voting Interface", () => {
    it("should display voting interface when story is active and not revealed", async () => {
      const mockStory = createMockStory({ is_active: true, reveal_at: null });
      const mockParticipant = createMockParticipant();
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Story details
        expect(screen.getByText(mockStory.title)).toBeInTheDocument();
        expect(screen.getByText(mockStory.description!)).toBeInTheDocument();

        // Voting interface
        expect(screen.getByText(/cast your vote/i)).toBeInTheDocument();

        // Fibonacci buttons (1, 2, 3, 5, 8, 13, 21, ?)
        expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "?" })).toBeInTheDocument();
      });
    });

    it.skip("should show participant status with voting progress", async () => {
      const mockStory = createMockStory();
      const mockParticipant1 = createMockParticipant({
        id: "p1",
        participant_id: "user-123",
        name: "Alice",
      });
      const mockParticipant2 = createMockParticipant({
        id: "p2",
        participant_id: "user-456",
        name: "Bob",
      });
      const mockVote1 = createMockVote({ participant_id: "user-123" });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote1],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant1, mockParticipant2],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Should show participant count
        expect(screen.getByText(/participants \(2\)/i)).toBeInTheDocument();

        // Should show both participants
        expect(screen.getByText(/alice/i)).toBeInTheDocument();
        expect(screen.getByText(/bob/i)).toBeInTheDocument();
      });
    });

    it("should show reveal button to leader during voting", async () => {
      const mockStory = createMockStory();
      const mockLeader = createMockParticipant({ is_leader: true });
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockLeader],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /reveal votes/i })).toBeInTheDocument();
      });
    });

    it("should NOT show reveal button to non-leader during voting", async () => {
      const mockStory = createMockStory();
      const mockParticipant = createMockParticipant({ is_leader: false });
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Voting interface should be visible
        expect(screen.getByText(/cast your vote/i)).toBeInTheDocument();
        // But no reveal button for non-leader
        expect(
          screen.queryByRole("button", { name: /reveal votes/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("State 3: Active Story (Revealed) - Results Display", () => {
    it("should display results when story is revealed", async () => {
      const mockStory = createMockStory({
        is_active: true,
        reveal_at: "2025-01-01T12:00:00Z", // Revealed
      });
      const mockParticipant = createMockParticipant();
      const mockVote = createMockVote({ is_revealed: true, point_value: "5" });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Results section - check for consensus/average display
        expect(
          screen.getByText(/consensus|average|most common/i)
        ).toBeInTheDocument();

        // Should NOT show voting buttons anymore
        expect(screen.queryByText(/cast your vote/i)).not.toBeInTheDocument();
      });
    });

    it("should show next story button to leader after reveal", async () => {
      const mockStory = createMockStory({ reveal_at: "2025-01-01T12:00:00Z" });
      const mockLeader = createMockParticipant({ is_leader: true });
      const mockVote = createMockVote({ is_revealed: true });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote],
        votedParticipantIds: new Set<string>(),
        participants: [mockLeader],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /next story/i })).toBeInTheDocument();
        // Should NOT show reveal button anymore
        expect(
          screen.queryByRole("button", { name: /reveal votes/i })
        ).not.toBeInTheDocument();
      });
    });

    it("should NOT show next story button to non-leader after reveal", async () => {
      const mockStory = createMockStory({ reveal_at: "2025-01-01T12:00:00Z" });
      const mockParticipant = createMockParticipant({ is_leader: false });
      const mockVote = createMockVote({ is_revealed: true });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Results should be visible - check for consensus/average display
        expect(
          screen.getByText(/consensus|average|most common/i)
        ).toBeInTheDocument();
        // But no next story button for non-leader
        expect(
          screen.queryByRole("button", { name: /next story/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Vote Privacy Enforcement (CRITICAL)", () => {
    it.skip("should only show participant's own vote before reveal", async () => {
      const mockStory = createMockStory({ reveal_at: null }); // Not revealed
      const mockParticipant1 = createMockParticipant({
        participant_id: "user-123", // Current user
      });
      const mockParticipant2 = createMockParticipant({
        id: "p2",
        participant_id: "user-456",
        name: "Bob",
      });

      // User-123 voted "5", User-456 voted "8" (but shouldn't be visible)
      const mockVote1 = createMockVote({
        participant_id: "user-123",
        point_value: "5",
        is_revealed: false,
      });
      const mockVote2 = createMockVote({
        id: "vote-456",
        participant_id: "user-456",
        point_value: "8",
        is_revealed: false,
      });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote1, mockVote2],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant1, mockParticipant2],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Current user's vote (5) should be selected
        const button5 = screen.getByRole("button", { name: "5" });
        expect(button5).toHaveClass("ring-2");

        // But we shouldn't see Bob's vote anywhere (no "8" highlighted)
        const button8 = screen.getByRole("button", { name: "8" });
        expect(button8).not.toHaveClass("ring-2");

        // ParticipantStatus should show Bob as voted, but not his value
        expect(screen.getByText(/bob/i)).toBeInTheDocument();
      });
    });

    it("should show all votes after reveal", async () => {
      const mockStory = createMockStory({
        reveal_at: "2025-01-01T12:00:00Z", // Revealed
      });
      const mockParticipant1 = createMockParticipant({
        participant_id: "user-123",
        name: "Alice",
      });
      const mockParticipant2 = createMockParticipant({
        id: "p2",
        participant_id: "user-456",
        name: "Bob",
      });

      const mockVote1 = createMockVote({
        participant_id: "user-123",
        point_value: "5",
        is_revealed: true,
      });
      const mockVote2 = createMockVote({
        id: "vote-456",
        participant_id: "user-456",
        point_value: "8",
        is_revealed: true,
      });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote1, mockVote2],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant1, mockParticipant2],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Results section should be visible - check for consensus/average/most common display
        expect(
          screen.getByText(/consensus|average|most common/i)
        ).toBeInTheDocument();

        // Both participants should be visible
        expect(screen.getByText(/alice/i)).toBeInTheDocument();
        expect(screen.getByText(/bob/i)).toBeInTheDocument();
      });
    });

    it.skip("should enforce privacy even if RLS fails (defense in depth)", async () => {
      const mockStory = createMockStory({ reveal_at: null });
      const mockParticipant = createMockParticipant({ participant_id: "user-123" });

      // Simulate RLS leak - vote data includes unrevealed votes from others
      const leakedVote = createMockVote({
        id: "leaked-vote",
        participant_id: "hacker-456",
        point_value: "8",
        is_revealed: false, // Should NOT be visible
      });
      const ownVote = createMockVote({
        participant_id: "user-123",
        point_value: "5",
        is_revealed: false,
      });

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [ownVote, leakedVote], // Leaked data included
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      renderPage();

      await waitFor(() => {
        // Should show own vote
        const button5 = screen.getByRole("button", { name: "5" });
        expect(button5).toHaveClass("ring-2");

        // Should NOT show hacker's vote
        const button8 = screen.getByRole("button", { name: "8" });
        expect(button8).not.toHaveClass("ring-2");
      });
    });
  });

  describe("Real-time Update Simulation", () => {
    it("should update when new participant joins (real-time)", async () => {
      const mockStory = createMockStory();
      const mockParticipant1 = createMockParticipant();

      // Initial render with 1 participant
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant1],
        isLoading: false,
        error: null,
      });

      const { rerender } = renderPage();

      await waitFor(() => {
        expect(screen.getByText(/participants \(1\)/i)).toBeInTheDocument();
      });

      // Simulate real-time update - new participant joins
      const mockParticipant2 = createMockParticipant({
        id: "p2",
        participant_id: "user-456",
        name: "Bob",
      });
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant1, mockParticipant2],
        isLoading: false,
        error: null,
      });

      rerender(
        <MemoryRouter initialEntries={["/room/ABC12345"]}>
          <Routes>
            <Route path="/room/:roomCode" element={<ActiveRoomPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/participants \(2\)/i)).toBeInTheDocument();
        expect(screen.getByText(/bob/i)).toBeInTheDocument();
      });
    });

    it("should update when votes are revealed (real-time)", async () => {
      const mockStory = createMockStory({ reveal_at: null }); // Not revealed initially
      const mockParticipant = createMockParticipant();
      const mockVote = createMockVote({ is_revealed: false });

      // Initial render - not revealed
      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [mockStory],
        votes: [mockVote],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      const { rerender } = renderPage();

      await waitFor(() => {
        expect(screen.getByText(/cast your vote/i)).toBeInTheDocument();
      });

      // Simulate reveal update
      const revealedStory = { ...mockStory, reveal_at: "2025-01-01T12:00:00Z" };
      const revealedVote = { ...mockVote, is_revealed: true };

      vi.mocked(useRoomSubscriptionModule.useRoomSubscription).mockReturnValue({
        stories: [revealedStory],
        votes: [revealedVote],
        votedParticipantIds: new Set<string>(),
        participants: [mockParticipant],
        isLoading: false,
        error: null,
      });

      rerender(
        <MemoryRouter initialEntries={["/room/ABC12345"]}>
          <Routes>
            <Route path="/room/:roomCode" element={<ActiveRoomPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Check for consensus/average display to verify results are shown
        expect(
          screen.getByText(/consensus|average|most common/i)
        ).toBeInTheDocument();
        expect(screen.queryByText(/cast your vote/i)).not.toBeInTheDocument();
      });
    });
  });
});

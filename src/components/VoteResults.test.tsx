import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteResults } from "./VoteResults";
import type { Tables } from "@/lib/supabase/client";

// Mock participants
const mockParticipants: Tables<"participants">[] = [
  {
    id: "p1",
    room_id: "room1",
    user_id: null,
    name: "Alice",
    is_leader: true,
    is_active: true,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "p2",
    room_id: "room1",
    user_id: null,
    name: "Bob",
    is_leader: false,
    is_active: true,
    joined_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "p3",
    room_id: "room1",
    user_id: null,
    name: "Charlie",
    is_leader: false,
    is_active: true,
    joined_at: "2024-01-01T00:00:00Z",
  },
];

describe("VoteResults", () => {
  describe("Fibonacci scale", () => {
    it("displays consensus when all votes are the same", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
        {
          id: "v3",
          story_id: "story1",
          participant_id: "p3",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:02:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      // Check for consensus label
      expect(screen.getByText("Consensus")).toBeInTheDocument();

      // Check for consensus value in the consensus card (text-6xl)
      const consensusCard = container.querySelector(".text-6xl");
      expect(consensusCard).toHaveTextContent("5");
    });

    it("displays average when votes are mixed", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "3",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
        {
          id: "v3",
          story_id: "story1",
          participant_id: "p3",
          point_value: "8",
          is_revealed: true,
          created_at: "2024-01-01T00:02:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      // Average of 3, 5, 8 is 5.3
      const consensusCard = container.querySelector(".text-6xl");
      expect(consensusCard).toHaveTextContent("5.3");
      expect(screen.getByText("Average")).toBeInTheDocument();
    });

    it("highlights consensus votes with green border", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      // Both cards should have green border (consensus)
      const cards = container.querySelectorAll(".border-green-500");
      expect(cards.length).toBe(2);
    });

    it("highlights outlier votes with yellow border", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "1",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "13",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      // Average is 7, closest Fibonacci is 8
      // 1 is 4 steps away (outlier - yellow)
      // 13 is 2 steps away (consensus - green)
      const yellowCards = container.querySelectorAll(".border-yellow-500");
      expect(yellowCards.length).toBeGreaterThan(0);
    });

    it("displays 'No Consensus' when all votes are '?'", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "?",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "?",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
      ];

      render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      expect(screen.getByText("No Consensus")).toBeInTheDocument();
      expect(screen.getByText('All votes are "?"')).toBeInTheDocument();
    });
  });

  describe("T-shirt scale", () => {
    it("displays consensus when all votes are the same", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "M",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "M",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="t-shirt"
        />
      );

      // Check for consensus label
      expect(screen.getByText("Consensus")).toBeInTheDocument();

      // Check for consensus value in the consensus card (text-6xl)
      const consensusCard = container.querySelector(".text-6xl");
      expect(consensusCard).toHaveTextContent("M");
    });

    it("displays most common value when votes are mixed", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "S",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "M",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
        {
          id: "v3",
          story_id: "story1",
          participant_id: "p3",
          point_value: "M",
          is_revealed: true,
          created_at: "2024-01-01T00:02:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="t-shirt"
        />
      );

      // Mode is M (appears twice)
      const consensusCard = container.querySelector(".text-6xl");
      expect(consensusCard).toHaveTextContent("M");
      expect(screen.getByText("Most Common")).toBeInTheDocument();
    });

    it("highlights consensus votes with green border", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "M",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "L",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="t-shirt"
        />
      );

      // Mode is M (first in list), L is within 1 step (consensus)
      // Both should have green border
      const greenCards = container.querySelectorAll(".border-green-500");
      expect(greenCards.length).toBe(2);
    });

    it("displays 'No Consensus' when all votes are '?'", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "?",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
      ];

      render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="t-shirt"
        />
      );

      expect(screen.getByText("No Consensus")).toBeInTheDocument();
    });
  });

  describe("rendering behavior", () => {
    it("does not render when no votes are revealed", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "5",
          is_revealed: false,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("sorts votes by value in ascending order", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "8",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
        {
          id: "v2",
          story_id: "story1",
          participant_id: "p2",
          point_value: "3",
          is_revealed: true,
          created_at: "2024-01-01T00:01:00Z",
          sentiment: null,
        },
        {
          id: "v3",
          story_id: "story1",
          participant_id: "p3",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:02:00Z",
          sentiment: null,
        },
      ];

      const { container } = render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      // Get all individual vote cards (text-3xl within truncate containers, not the consensus)
      const voteCards = container.querySelectorAll(".truncate .text-3xl");
      expect(voteCards[0].textContent).toBe("3");
      expect(voteCards[1].textContent).toBe("5");
      expect(voteCards[2].textContent).toBe("8");
    });

    it("displays participant names with their votes", () => {
      const votes: Tables<"votes">[] = [
        {
          id: "v1",
          story_id: "story1",
          participant_id: "p1",
          point_value: "5",
          is_revealed: true,
          created_at: "2024-01-01T00:00:00Z",
          sentiment: null,
        },
      ];

      render(
        <VoteResults
          votes={votes}
          participants={mockParticipants}
          pointScale="fibonacci"
        />
      );

      expect(screen.getByText("Alice")).toBeInTheDocument();
      // Check that a vote card with value 5 exists
      const voteCards = screen.getAllByText("5");
      expect(voteCards.length).toBeGreaterThan(0);
    });
  });
});

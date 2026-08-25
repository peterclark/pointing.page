import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParticipantStatus } from "./ParticipantStatus";
import type { Tables } from "@/lib/supabase/client";

describe("ParticipantStatus", () => {
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
      joined_at: "2024-01-01T00:01:00Z",
    },
    {
      id: "p3",
      room_id: "room1",
      user_id: null,
      name: "Carol",
      is_leader: false,
      is_active: true,
      joined_at: "2024-01-01T00:02:00Z",
    },
  ];

  const mockVotes: Tables<"votes">[] = [
    {
      id: "v1",
      story_id: "story1",
      participant_id: "p1",
      point_value: "5",
      sentiment: null,
      is_revealed: false,
      created_at: "2024-01-01T00:10:00Z",
    },
    {
      id: "v2",
      story_id: "story1",
      participant_id: "p3",
      point_value: "8",
      sentiment: null,
      is_revealed: false,
      created_at: "2024-01-01T00:11:00Z",
    },
  ];

  it("renders all participants", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[]}
        votedParticipantIds={new Set<string>()}
        isRevealed={false}
      />
    );

    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
    expect(screen.getByText(/carol/i)).toBeInTheDocument();
  });

  it("shows leader indicator for room leader", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[]}
        votedParticipantIds={new Set<string>()}
        isRevealed={false}
      />
    );

    // Alice is the leader and should have crown emoji
    const aliceBadge = screen.getByText(/alice/i).closest("span");
    expect(aliceBadge?.textContent).toContain("👑");

    // Bob is not the leader
    const bobBadge = screen.getByText(/bob/i).closest("span");
    expect(bobBadge?.textContent).not.toContain("👑");
  });

  it("shows checkmark icon for participants who voted", () => {
    const { container } = render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={mockVotes}
        votedParticipantIds={new Set(mockVotes.map((v) => v.participant_id))}
        isRevealed={false}
      />
    );

    // Alice and Carol voted, Bob did not
    // We can check for the presence of CheckCircle2 vs Circle icons
    const badges = container.querySelectorAll('[class*="gap-1.5"]');
    expect(badges.length).toBe(3);
  });

  it("hides point values before reveal", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={mockVotes}
        votedParticipantIds={new Set(mockVotes.map((v) => v.participant_id))}
        isRevealed={false}
      />
    );

    // Point values should not be visible
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("8")).not.toBeInTheDocument();
  });

  it("shows point values after reveal", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={mockVotes}
        votedParticipantIds={new Set(mockVotes.map((v) => v.participant_id))}
        isRevealed={true}
      />
    );

    // Point values should be visible after reveal
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows empty circle for participants who have not voted", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[mockVotes[0]]}
        votedParticipantIds={new Set([mockVotes[0].participant_id])}
        isRevealed={false}
      />
    );

    // Alice voted (p1), Bob and Carol did not
    // All participants should still be rendered
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
    expect(screen.getByText(/carol/i)).toBeInTheDocument();
  });

  it("handles empty participant list", () => {
    const { container } = render(
      <ParticipantStatus
        participants={[]}
        votes={[]}
        votedParticipantIds={new Set<string>()}
        isRevealed={false}
      />
    );

    const badges = container.querySelectorAll('[class*="gap-1.5"]');
    expect(badges.length).toBe(0);
  });

  it("handles all participants voted scenario", () => {
    const allVotes: Tables<"votes">[] = [
      ...mockVotes,
      {
        id: "v3",
        story_id: "story1",
        participant_id: "p2",
        point_value: "3",
        sentiment: null,
        is_revealed: false,
        created_at: "2024-01-01T00:12:00Z",
      },
    ];

    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={allVotes}
        votedParticipantIds={new Set(allVotes.map((v) => v.participant_id))}
        isRevealed={false}
      />
    );

    // All three participants should be rendered
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
    expect(screen.getByText(/carol/i)).toBeInTheDocument();
  });

  it("marks a participant as voted with no vote row present", () => {
    // The regression this guards: RLS withholds another participant's
    // unrevealed vote entirely, so `votes` holds only your own until the
    // reveal. Deriving hasVoted from `votes` left every other pill unlit while
    // the room was actually voting.
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[]}
        votedParticipantIds={new Set(["p1", "p3"])}
        isRevealed={false}
      />
    );

    const badge = (name: RegExp) =>
      screen.getByText(name).closest("[class*='gap-1.5']");

    expect(badge(/alice/i)?.querySelector(".lucide-circle-check")).toBeTruthy();
    expect(badge(/carol/i)?.querySelector(".lucide-circle-check")).toBeTruthy();
    // Bob gets the hollow circle, not the tick.
    expect(badge(/bob/i)?.querySelector(".lucide-circle-check")).toBeFalsy();
    expect(badge(/bob/i)?.querySelector(".lucide-circle")).toBeTruthy();
  });

  it("does not leak an estimate just because someone has voted", () => {
    render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[]}
        votedParticipantIds={new Set(["p1", "p2", "p3"])}
        isRevealed={false}
      />
    );

    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("8")).not.toBeInTheDocument();
  });

  it("shows your own value only after the reveal, even though you voted", () => {
    const { rerender } = render(
      <ParticipantStatus
        participants={mockParticipants}
        votes={[mockVotes[0]]}
        votedParticipantIds={new Set(["p1", "p3"])}
        isRevealed={false}
      />
    );
    expect(screen.queryByText("5")).not.toBeInTheDocument();

    rerender(
      <ParticipantStatus
        participants={mockParticipants}
        votes={mockVotes}
        votedParticipantIds={new Set(["p1", "p3"])}
        isRevealed={true}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

});

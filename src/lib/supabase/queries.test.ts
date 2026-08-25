/**
 * Tests for the room, participant, story and vote query functions.
 *
 * Profile queries are covered separately in `queries.profile.test.ts`.
 *
 * These are contract tests for the data layer: they assert the request each
 * function builds (table, columns, filters, payload) and how it translates a
 * PostgREST failure into a `DatabaseError`. The Supabase client is stubbed via
 * `mockQuery`, so nothing here touches a network or a database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRoomByCode,
  createRoom,
  updateRoom,
  joinRoom,
  getActiveParticipants,
  leaveRoom,
  createStory,
  setActiveStory,
  clearActiveStory,
  getActiveStory,
  submitVote,
  revealVotes,
  getStoryVotes,
  updateStoryAverage,
  DatabaseError,
} from "./queries";
import { supabase } from "./client";
import { mockQuery, mockQueryError } from "@/tests/supabase-mock";

vi.mock("./client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const room = {
  id: "room-1",
  room_code: "ABC12345",
  name: "Sprint Planning",
  point_scale: "fibonacci" as const,
  leader_id: null,
  created_at: "2024-01-01T00:00:00Z",
};

const participant = {
  id: "participant-1",
  room_id: "room-1",
  user_id: null,
  name: "Ada",
  is_leader: false,
  is_active: true,
  joined_at: "2024-01-01T00:00:00Z",
};

const story = {
  id: "story-1",
  room_id: "room-1",
  title: "Add login",
  description: null,
  is_active: false,
  final_average: null,
  created_at: "2024-01-01T00:00:00Z",
};

const vote = {
  id: "vote-1",
  story_id: "story-1",
  participant_id: "participant-1",
  point_value: "5",
  is_revealed: false,
  sentiment: null,
  created_at: "2024-01-01T00:00:00Z",
};

/** Queue builders so successive `supabase.from(...)` calls get distinct stubs. */
function queueFrom(...queries: ReturnType<typeof mockQuery>[]) {
  const from = vi.mocked(supabase.from);
   
  queries.forEach((q) => from.mockReturnValueOnce(q as any));
  return queries;
}

beforeEach(() => {
  // resetAllMocks, not clearAllMocks: the latter clears recorded calls but
  // leaves queued mockReturnValueOnce values in place, so a stub one test
  // queues but does not consume silently surfaces in the next.
  vi.resetAllMocks();
});

describe("getRoomByCode", () => {
  it("uppercases the code before querying and returns the room", async () => {
    const [q] = queueFrom(mockQuery({ data: room }));

    await expect(getRoomByCode("abc12345")).resolves.toEqual(room);

    expect(supabase.from).toHaveBeenCalledWith("rooms");
    expect(q.argsFor("eq")).toEqual(["room_code", "ABC12345"]);
    expect(q.methods).toContain("maybeSingle");
  });

  it("returns null when no room matches", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(getRoomByCode("ZZZZZZZZ")).resolves.toBeNull();
  });

  it("wraps a query failure in a DatabaseError carrying the PostgREST code", async () => {
    queueFrom(mockQueryError("connection reset", "08006"));

    const error = await getRoomByCode("ABC12345").catch((e) => e);

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toContain("connection reset");
    expect(error.code).toBe("08006");
  });
});

describe("createRoom", () => {
  it("generates a room code via RPC and inserts the room", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
       
      mockQuery({ data: "ABC12345" }) as any
    );
    const [q] = queueFrom(mockQuery({ data: room }));

    await expect(createRoom("Sprint Planning", "fibonacci")).resolves.toEqual(room);

    expect(supabase.rpc).toHaveBeenCalledWith("generate_room_code");
    expect(q.argsFor("insert")).toEqual([
      { name: "Sprint Planning", point_scale: "fibonacci", room_code: "ABC12345" },
    ]);
  });

  it("defaults to the fibonacci scale", async () => {
     
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery({ data: "ABC12345" }) as any);
    const [q] = queueFrom(mockQuery({ data: room }));

    await createRoom("Sprint Planning");

    expect(q.argsFor("insert")?.[0]).toMatchObject({ point_scale: "fibonacci" });
  });

  it("fails before inserting when the code RPC errors", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
       
      mockQuery({ data: null, error: { message: "rpc unavailable" } }) as any
    );

    await expect(createRoom("Sprint Planning")).rejects.toThrow(/Failed to generate room code/);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws when the insert reports success but returns no row", async () => {
     
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery({ data: "ABC12345" }) as any);
    queueFrom(mockQuery({ data: null }));

    await expect(createRoom("Sprint Planning")).rejects.toThrow(
      /Room created but no data returned/
    );
  });
});

describe("updateRoom", () => {
  it("applies the patch to the addressed room", async () => {
    const [q] = queueFrom(mockQuery({ data: { ...room, name: "Renamed" } }));

    await expect(updateRoom("room-1", { name: "Renamed" })).resolves.toMatchObject({
      name: "Renamed",
    });

    expect(q.argsFor("update")).toEqual([{ name: "Renamed" }]);
    expect(q.argsFor("eq")).toEqual(["id", "room-1"]);
  });

  it("reports a leader-only violation when RLS returns PGRST116", async () => {
    queueFrom(mockQueryError("no rows", "PGRST116"));

    await expect(updateRoom("room-1", { name: "Renamed" })).rejects.toThrow(
      /Only the room leader can update room settings/
    );
  });
});

describe("joinRoom", () => {
  it("makes the first participant in an empty room the leader", async () => {
    const leader = { ...participant, is_leader: true };
    const [, count, insert, promote] = queueFrom(
      mockQuery({ data: null }),
      mockQuery({ count: 0 }),
      mockQuery({ data: leader }),
      mockQuery()
    );

    await expect(joinRoom("room-1", "user-1", "Ada")).resolves.toEqual(leader);

    expect(count.argsFor("select")).toEqual(["*", { count: "exact", head: true }]);
    expect(insert.argsFor("insert")?.[0]).toMatchObject({
      room_id: "room-1",
      user_id: "user-1",
      name: "Ada",
      is_leader: true,
      is_active: true,
    });
    // The room's leader_id is back-filled to point at the new participant.
    expect(promote.argsFor("update")).toEqual([{ leader_id: "participant-1" }]);
  });

  it("does not make a later participant the leader", async () => {
    const [, , insert] = queueFrom(
      mockQuery({ data: null }),
      mockQuery({ count: 2 }),
      mockQuery({ data: participant })
    );

    await joinRoom("room-1", "user-2", "Grace");

    expect(insert.argsFor("insert")?.[0]).toMatchObject({ is_leader: false });
    // Lookup, count and insert — no leader promotion.
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });

  it("reactivates and renames an existing record instead of inserting a duplicate", async () => {
    const existing = { ...participant, user_id: "user-1", is_active: false };
    const [lookup, update] = queueFrom(
      mockQuery({ data: existing }),
      mockQuery({ data: { ...existing, is_active: true, name: "Ada L." } })
    );

    await expect(joinRoom("room-1", "user-1", "Ada L.")).resolves.toMatchObject({
      is_active: true,
      name: "Ada L.",
    });

    expect(lookup.calls.filter((c) => c.method === "eq")).toEqual([
      { method: "eq", args: ["room_id", "room-1"] },
      { method: "eq", args: ["user_id", "user-1"] },
    ]);
    expect(update.argsFor("update")?.[0]).toMatchObject({ is_active: true, name: "Ada L." });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("records the joining user on the new participant row", async () => {
    const [, , insert] = queueFrom(
      mockQuery({ data: null }),
      mockQuery({ count: 1 }),
      mockQuery({ data: participant })
    );

    await joinRoom("room-1", "user-3", "Anon");

    // participants_insert checks user_id = auth.uid(), so an unset user_id
    // would be rejected outright by the database.
    expect(insert.argsFor("insert")?.[0]).toMatchObject({ user_id: "user-3" });
  });

  it("wraps an insert failure in a DatabaseError", async () => {
    queueFrom(
      mockQuery({ data: null }),
      mockQuery({ count: 0 }),
      mockQueryError("insert denied")
    );

    await expect(joinRoom("room-1", "user-1", "Ada")).rejects.toThrow(
      /Failed to join room/
    );
  });
});

describe("getActiveParticipants", () => {
  it("filters to active participants ordered by join time", async () => {
    const [q] = queueFrom(mockQuery({ data: [participant] }));

    await expect(getActiveParticipants("room-1")).resolves.toEqual([participant]);

    expect(q.calls.filter((c) => c.method === "eq")).toEqual([
      { method: "eq", args: ["room_id", "room-1"] },
      { method: "eq", args: ["is_active", true] },
    ]);
    expect(q.argsFor("order")).toEqual(["joined_at", { ascending: true }]);
  });

  it("returns an empty array rather than null when there are no rows", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(getActiveParticipants("room-1")).resolves.toEqual([]);
  });
});

describe("leaveRoom", () => {
  it("soft-deletes by clearing is_active", async () => {
    const [q] = queueFrom(mockQuery());

    await expect(leaveRoom("participant-1")).resolves.toBeUndefined();

    expect(q.argsFor("update")).toEqual([{ is_active: false }]);
    expect(q.argsFor("eq")).toEqual(["id", "participant-1"]);
  });

  it("wraps a failure in a DatabaseError", async () => {
    queueFrom(mockQueryError("update denied"));

    await expect(leaveRoom("participant-1")).rejects.toThrow(/Failed to leave room/);
  });
});

describe("createStory", () => {
  it("creates the story inactive so the leader can activate it deliberately", async () => {
    const [q] = queueFrom(mockQuery({ data: story }));

    await expect(createStory("room-1", "Add login")).resolves.toEqual(story);

    expect(q.argsFor("insert")).toEqual([
      { room_id: "room-1", title: "Add login", description: null, is_active: false },
    ]);
  });

  it("normalises an empty description to null", async () => {
    const [q] = queueFrom(mockQuery({ data: story }));

    await createStory("room-1", "Add login", "");

    expect(q.argsFor("insert")?.[0]).toMatchObject({ description: null });
  });

  it("reports a leader-only violation when RLS returns PGRST116", async () => {
    queueFrom(mockQueryError("no rows", "PGRST116"));

    await expect(createStory("room-1", "Add login")).rejects.toThrow(
      /Only the room leader can create stories/
    );
  });
});

describe("setActiveStory", () => {
  it("deactivates every story in the room before activating the target", async () => {
    const [lookup, deactivate, activate] = queueFrom(
      mockQuery({ data: { room_id: "room-1" } }),
      mockQuery(),
      mockQuery({ data: { ...story, is_active: true } })
    );

    await expect(setActiveStory("story-1")).resolves.toMatchObject({ is_active: true });

    expect(lookup.argsFor("select")).toEqual(["room_id"]);
    expect(deactivate.argsFor("update")).toEqual([{ is_active: false }]);
    expect(deactivate.argsFor("eq")).toEqual(["room_id", "room-1"]);
    expect(activate.argsFor("update")).toEqual([{ is_active: true }]);
    expect(activate.argsFor("eq")).toEqual(["id", "story-1"]);
  });

  it("fails without touching other stories when the story is missing", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(setActiveStory("missing")).rejects.toThrow(/Story not found/);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("clearActiveStory", () => {
  it("deactivates all stories in the room", async () => {
    const [q] = queueFrom(mockQuery());

    await expect(clearActiveStory("room-1")).resolves.toBeUndefined();

    expect(q.argsFor("update")).toEqual([{ is_active: false }]);
    expect(q.argsFor("eq")).toEqual(["room_id", "room-1"]);
  });

  it("reports a leader-only violation when RLS returns PGRST116", async () => {
    queueFrom(mockQueryError("no rows", "PGRST116"));

    await expect(clearActiveStory("room-1")).rejects.toThrow(
      /Only the room leader can clear active story/
    );
  });
});

describe("getActiveStory", () => {
  it("returns the single active story for the room", async () => {
    const active = { ...story, is_active: true };
    const [q] = queueFrom(mockQuery({ data: active }));

    await expect(getActiveStory("room-1")).resolves.toEqual(active);

    expect(q.calls.filter((c) => c.method === "eq")).toEqual([
      { method: "eq", args: ["room_id", "room-1"] },
      { method: "eq", args: ["is_active", true] },
    ]);
  });

  it("returns null when nothing is being voted on", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(getActiveStory("room-1")).resolves.toBeNull();
  });
});

describe("submitVote", () => {
  it("upserts on (story_id, participant_id) so re-voting overwrites", async () => {
    const [q] = queueFrom(mockQuery({ data: vote }));

    await expect(submitVote("story-1", "participant-1", "5")).resolves.toEqual(vote);

    expect(q.argsFor("upsert")).toEqual([
      { story_id: "story-1", participant_id: "participant-1", point_value: "5", sentiment: null },
      { onConflict: "story_id,participant_id" },
    ]);
  });

  it("passes an optional sentiment through", async () => {
    const [q] = queueFrom(mockQuery({ data: { ...vote, sentiment: "confident" } }));

    await submitVote("story-1", "participant-1", "5", "confident");

     
    expect((q.argsFor("upsert")?.[0] as any).sentiment).toBe("confident");
  });

  it("wraps a failure in a DatabaseError", async () => {
    queueFrom(mockQueryError("vote rejected"));

    await expect(submitVote("story-1", "participant-1", "5")).rejects.toThrow(
      /Failed to submit vote/
    );
  });
});

describe("revealVotes", () => {
  it("delegates to the reveal_votes function rather than updating votes", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery() as never);

    await expect(revealVotes("story-1")).resolves.toBeUndefined();

    // RLS grants per row, never per column, so a leader-shaped UPDATE policy
    // would also let the leader rewrite other people's estimates.
    expect(supabase.rpc).toHaveBeenCalledWith("reveal_votes", {
      target_story_id: "story-1",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reports a leader-only violation when the function refuses", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
      mockQuery({ error: { message: "insufficient privilege", code: "42501" } }) as never
    );

    await expect(revealVotes("story-1")).rejects.toThrow(
      /Only the room leader can reveal votes/
    );
  });

  it("wraps any other failure in a DatabaseError", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
      mockQuery({ error: { message: "connection reset", code: "08006" } }) as never
    );

    await expect(revealVotes("story-1")).rejects.toThrow(/Failed to reveal votes/);
  });
});

describe("getStoryVotes", () => {
  it("returns the story's votes in creation order", async () => {
    const [q] = queueFrom(mockQuery({ data: [vote] }));

    await expect(getStoryVotes("story-1")).resolves.toEqual([vote]);

    expect(q.argsFor("eq")).toEqual(["story_id", "story-1"]);
    expect(q.argsFor("order")).toEqual(["created_at", { ascending: true }]);
  });

  it("returns an empty array when nobody has voted", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(getStoryVotes("story-1")).resolves.toEqual([]);
  });
});

describe("updateStoryAverage", () => {
  it("writes the final average onto the story", async () => {
    const [q] = queueFrom(mockQuery());

    await expect(updateStoryAverage("story-1", 5.5)).resolves.toBeUndefined();

    expect(q.argsFor("update")).toEqual([{ final_average: 5.5 }]);
    expect(q.argsFor("eq")).toEqual(["id", "story-1"]);
  });

  it("reports a leader-only violation when RLS returns PGRST116", async () => {
    queueFrom(mockQueryError("no rows", "PGRST116"));

    await expect(updateStoryAverage("story-1", 5.5)).rejects.toThrow(
      /Only the room leader can update story data/
    );
  });
});

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
  it("creates the room and its leader through the create_room function", async () => {
    const rpc = mockQuery({ data: room });
    vi.mocked(supabase.rpc).mockReturnValue(rpc as never);

    await expect(createRoom("Sprint Planning", "Ada", "t-shirt")).resolves.toEqual(room);

    // Clients hold no INSERT privilege on rooms or participants, so leadership
    // is assigned by the database rather than claimed by the client.
    expect(supabase.rpc).toHaveBeenCalledWith("create_room", {
      room_name: "Sprint Planning",
      scale: "t-shirt",
      display_name: "Ada",
    });
    expect(rpc.methods).toContain("single");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("defaults to the fibonacci scale", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery({ data: room }) as never);

    await createRoom("Sprint Planning", "Ada");

    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ scale: "fibonacci" });
  });

  it("wraps a function error in a DatabaseError carrying its code", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
      mockQueryError("Room name must be 1 to 100 characters", "22023") as never
    );

    const error = await createRoom("", "Ada").catch((e) => e);

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toMatch(/Failed to create room/);
    expect(error.code).toBe("22023");
  });

  it("throws when the function reports success but returns no row", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery({ data: null }) as never);

    await expect(createRoom("Sprint Planning", "Ada")).rejects.toThrow(
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
  it("joins through the join_room function, which decides leadership", async () => {
    const rpc = mockQuery({ data: participant });
    vi.mocked(supabase.rpc).mockReturnValue(rpc as never);

    await expect(joinRoom("room-1", "Ada")).resolves.toEqual(participant);

    // No user id or is_leader is sent: identity comes from the session and
    // leadership from the database.
    expect(supabase.rpc).toHaveBeenCalledWith("join_room", {
      target_room_id: "room-1",
      display_name: "Ada",
    });
    expect(rpc.methods).toContain("single");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("wraps a function error in a DatabaseError", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(
      mockQueryError("Room not found", "P0002") as never
    );

    await expect(joinRoom("room-1", "Ada")).rejects.toThrow(/Failed to join room/);
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

describe("unexpected failures", () => {
  // Every query function wraps its body in a try/catch that re-throws a
  // DatabaseError untouched and wraps anything else. The second branch only
  // runs when the client itself throws — a transport failure rather than a
  // PostgREST error response — which is exactly the case a caller is least
  // likely to have handled, so it is worth pinning that it still arrives as a
  // DatabaseError rather than a raw TypeError.
  const boom = () => {
    throw new TypeError("Failed to fetch");
  };

  beforeEach(() => {
    vi.mocked(supabase.from).mockImplementation(boom as never);
    vi.mocked(supabase.rpc).mockImplementation(boom as never);
  });

  const cases: Array<[string, () => Promise<unknown>, RegExp]> = [
    ["getRoomByCode", () => getRoomByCode("ABC12345"), /Unexpected error while getting room by code/],
    ["createRoom", () => createRoom("Sprint", "Ada"), /Unexpected error while creating room/],
    ["updateRoom", () => updateRoom("room-1", { name: "x" }), /Unexpected error while updating room/],
    ["joinRoom", () => joinRoom("room-1", "Ada"), /Unexpected error while joining room/],
    ["getActiveParticipants", () => getActiveParticipants("room-1"), /Unexpected error while getting active participants/],
    ["leaveRoom", () => leaveRoom("participant-1"), /Unexpected error while leaving room/],
    ["createStory", () => createStory("room-1", "Title"), /Unexpected error while creating story/],
    ["setActiveStory", () => setActiveStory("story-1"), /Unexpected error while activating story/],
    ["clearActiveStory", () => clearActiveStory("room-1"), /Unexpected error while clearing active story/],
    ["getActiveStory", () => getActiveStory("room-1"), /Unexpected error while getting active story/],
    ["submitVote", () => submitVote("story-1", "participant-1", "5"), /Unexpected error while submitting vote/],
    ["revealVotes", () => revealVotes("story-1"), /Unexpected error while revealing votes/],
    ["getStoryVotes", () => getStoryVotes("story-1"), /Unexpected error while getting story votes/],
    ["updateStoryAverage", () => updateStoryAverage("story-1", 5), /Unexpected error while updating story average/],
  ];

  it.each(cases)("%s wraps a transport failure in a DatabaseError", async (_name, call, message) => {
    const error = await call().catch((e) => e);

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toMatch(message);
    // The original is preserved for debugging rather than discarded.
    expect(error.details).toBeInstanceOf(TypeError);
  });
});

describe("missing-row guards", () => {
  it("joinRoom throws when the function returns no row", async () => {
    vi.mocked(supabase.rpc).mockReturnValue(mockQuery({ data: null }) as never);

    await expect(joinRoom("room-1", "Ada")).rejects.toThrow(
      /Participant created but no data returned/
    );
  });

  it("updateRoom throws when the update returns no row", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(updateRoom("room-1", { name: "x" })).rejects.toThrow(
      /Room updated but no data returned/
    );
  });

  it("createStory throws when the insert returns no row", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(createStory("room-1", "Title")).rejects.toThrow(
      /Story created but no data returned/
    );
  });

  it("submitVote throws when the upsert returns no row", async () => {
    queueFrom(mockQuery({ data: null }));

    await expect(submitVote("story-1", "participant-1", "5")).rejects.toThrow(
      /Vote submitted but no data returned/
    );
  });

  it("setActiveStory throws when the activation returns no row", async () => {
    queueFrom(
      mockQuery({ data: { room_id: "room-1" } }),
      mockQuery(),
      mockQuery({ data: null })
    );

    await expect(setActiveStory("story-1")).rejects.toThrow(
      /Story activated but no data returned/
    );
  });

  it("setActiveStory reports a leader-only violation on activation", async () => {
    queueFrom(
      mockQuery({ data: { room_id: "room-1" } }),
      mockQuery(),
      mockQueryError("no rows", "PGRST116")
    );

    await expect(setActiveStory("story-1")).rejects.toThrow(
      /Only the room leader can activate stories/
    );
  });

  it("getActiveStory wraps a query failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(getActiveStory("room-1")).rejects.toThrow(/Failed to get active story/);
  });

  it("getActiveParticipants wraps a query failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(getActiveParticipants("room-1")).rejects.toThrow(
      /Failed to get active participants/
    );
  });

  it("getStoryVotes wraps a query failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(getStoryVotes("story-1")).rejects.toThrow(/Failed to get story votes/);
  });

  it("clearActiveStory wraps a non-RLS failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(clearActiveStory("room-1")).rejects.toThrow(/Failed to clear active story/);
  });

  it("updateStoryAverage wraps a non-RLS failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(updateStoryAverage("story-1", 5)).rejects.toThrow(
      /Failed to update story average/
    );
  });

  it("createStory wraps a non-RLS failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(createStory("room-1", "Title")).rejects.toThrow(/Failed to create story/);
  });

  it("setActiveStory wraps a lookup failure", async () => {
    queueFrom(mockQueryError("boom"));

    await expect(setActiveStory("story-1")).rejects.toThrow(/Failed to get story/);
  });
});

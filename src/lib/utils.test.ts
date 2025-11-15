import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateRoomName,
  formatRoomCode,
  getParticipantId,
  getParticipantName,
  saveParticipantName,
  copyToClipboard,
  FIBONACCI_SCALE,
  TSHIRT_SCALE,
  getFibonacciValues,
  getTshirtValues,
  getPointScaleValues,
  calculateFibonacciConsensus,
  calculateTshirtConsensus,
  isConsensusVote,
  sortVotesByValue,
  filterVisibleVotes,
} from "./utils";

describe("Room Name Generator", () => {
  it("generates room name in Adjective-Noun format with hyphen", () => {
    const roomName = generateRoomName();

    // Should contain exactly one hyphen
    expect(roomName.split("-")).toHaveLength(2);

    // Should match pattern: Word-Word with capital first letters
    expect(roomName).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+$/);
  });
});

describe("Room Code Formatter", () => {
  it("formats 8-character code to ABC1-2345 style", () => {
    expect(formatRoomCode("abc12345")).toBe("ABC1-2345");
    expect(formatRoomCode("test1234")).toBe("TEST-1234");
    expect(formatRoomCode("HELLO123")).toBe("HELL-O123");
  });

  it("converts lowercase to uppercase", () => {
    const formatted = formatRoomCode("abcd1234");
    expect(formatted).toBe("ABCD-1234");
    expect(formatted).not.toContain("abcd");
  });
});

describe("localStorage Utilities", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("generates and persists participant ID on first call", () => {
    const id1 = getParticipantId();
    const id2 = getParticipantId();

    // Should be a valid UUID format
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Should return same ID on subsequent calls
    expect(id1).toBe(id2);
  });

  it("saves and retrieves participant name", () => {
    // Initially no name saved
    expect(getParticipantName()).toBeNull();

    // Save a name
    saveParticipantName("Alex");

    // Should retrieve the saved name
    expect(getParticipantName()).toBe("Alex");
  });
});

describe("Clipboard Utility", () => {
  it("returns true on successful copy", async () => {
    // Mock clipboard API using defineProperty
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard("test text");
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("test text");
  });

  it("returns false on copy failure", async () => {
    // Mock clipboard API to reject using defineProperty
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard("test text");
    expect(result).toBe(false);
  });
});

describe("Point Scale Constants and Accessors", () => {
  it("FIBONACCI_SCALE contains correct values", () => {
    expect(FIBONACCI_SCALE).toEqual(["1", "2", "3", "5", "8", "13", "21", "?"]);
  });

  it("TSHIRT_SCALE contains correct values", () => {
    expect(TSHIRT_SCALE).toEqual(["XS", "S", "M", "L", "XL", "XXL", "?"]);
  });

  it("getFibonacciValues returns Fibonacci scale", () => {
    expect(getFibonacciValues()).toEqual(FIBONACCI_SCALE);
  });

  it("getTshirtValues returns T-shirt scale", () => {
    expect(getTshirtValues()).toEqual(TSHIRT_SCALE);
  });

  it("getPointScaleValues returns correct scale based on input", () => {
    expect(getPointScaleValues("fibonacci")).toEqual(FIBONACCI_SCALE);
    expect(getPointScaleValues("t-shirt")).toEqual(TSHIRT_SCALE);
  });
});

describe("Fibonacci Consensus Calculation", () => {
  it("calculates average and rounds to nearest Fibonacci number", () => {
    const votes = ["3", "5", "5", "8"];
    const result = calculateFibonacciConsensus(votes);

    // Average should be (3 + 5 + 5 + 8) / 4 = 5.25
    expect(result.average).toBeCloseTo(5.25, 2);
    // Rounded to nearest Fibonacci should be 5
    expect(result.consensus).toBe(5);
    expect(result.outlierThreshold).toBe(2);
  });

  it("filters out ? votes from calculation", () => {
    const votes = ["3", "?", "5", "?", "8"];
    const result = calculateFibonacciConsensus(votes);

    // Average should be (3 + 5 + 8) / 3 = 5.33
    expect(result.average).toBeCloseTo(5.33, 2);
    expect(result.consensus).toBe(5);
  });

  it("returns zeros for all ? votes", () => {
    const votes = ["?", "?", "?"];
    const result = calculateFibonacciConsensus(votes);

    expect(result.average).toBe(0);
    expect(result.consensus).toBe(0);
    expect(result.outlierThreshold).toBe(0);
  });

  it("returns zeros for empty votes array", () => {
    const votes: string[] = [];
    const result = calculateFibonacciConsensus(votes);

    expect(result.average).toBe(0);
    expect(result.consensus).toBe(0);
  });

  it("rounds correctly to nearest Fibonacci value", () => {
    // Test clear rounding cases
    const votes1 = ["3", "5", "5"]; // avg 4.33 -> rounds to 5
    expect(calculateFibonacciConsensus(votes1).consensus).toBe(5);

    const votes2 = ["8", "8", "13"]; // avg 9.67 -> rounds to 8
    expect(calculateFibonacciConsensus(votes2).consensus).toBe(8);

    const votes3 = ["13", "21"]; // avg 17 -> rounds to 13 (13 is closer than 21)
    expect(calculateFibonacciConsensus(votes3).consensus).toBe(13);
  });
});

describe("T-shirt Consensus Calculation", () => {
  it("calculates mode (most common value)", () => {
    const votes = ["M", "L", "M", "XL", "M"];
    const result = calculateTshirtConsensus(votes);

    expect(result.mode).toBe("M");
    expect(result.consensus).toBe("M");
    expect(result.outlierThreshold).toBe(1);
  });

  it("filters out ? votes from calculation", () => {
    const votes = ["M", "?", "L", "?", "M"];
    const result = calculateTshirtConsensus(votes);

    expect(result.mode).toBe("M");
    expect(result.consensus).toBe("M");
  });

  it("returns empty result for all ? votes", () => {
    const votes = ["?", "?", "?"];
    const result = calculateTshirtConsensus(votes);

    expect(result.mode).toBe("");
    expect(result.consensus).toBe("");
  });

  it("returns empty result for empty votes array", () => {
    const votes: string[] = [];
    const result = calculateTshirtConsensus(votes);

    expect(result.mode).toBe("");
    expect(result.consensus).toBe("");
  });

  it("handles tie by returning first encountered mode", () => {
    // When there's a tie, Map iteration order determines which is returned
    const votes = ["S", "M", "S", "M"];
    const result = calculateTshirtConsensus(votes);

    // Should be one of the tied values
    expect(["S", "M"]).toContain(result.mode);
  });
});

describe("Consensus Vote Detection", () => {
  it("identifies consensus votes in Fibonacci scale (within 2 steps)", () => {
    // Consensus is 5 (index 3 in sequence)
    expect(isConsensusVote("3", 5, "fibonacci")).toBe(true); // 1 step away
    expect(isConsensusVote("5", 5, "fibonacci")).toBe(true); // exact match
    expect(isConsensusVote("8", 5, "fibonacci")).toBe(true); // 1 step away
    expect(isConsensusVote("13", 5, "fibonacci")).toBe(true); // 2 steps away
    expect(isConsensusVote("2", 5, "fibonacci")).toBe(true); // 2 steps away
  });

  it("identifies outliers in Fibonacci scale (more than 2 steps)", () => {
    // Consensus is 5 (index 3)
    expect(isConsensusVote("1", 5, "fibonacci")).toBe(false); // 3 steps away
    expect(isConsensusVote("21", 5, "fibonacci")).toBe(false); // 3 steps away
  });

  it("identifies consensus votes in T-shirt scale (within 1 step)", () => {
    // Consensus is M (index 2)
    expect(isConsensusVote("S", "M", "t-shirt")).toBe(true); // 1 step away
    expect(isConsensusVote("M", "M", "t-shirt")).toBe(true); // exact match
    expect(isConsensusVote("L", "M", "t-shirt")).toBe(true); // 1 step away
  });

  it("identifies outliers in T-shirt scale (more than 1 step)", () => {
    // Consensus is M (index 2)
    expect(isConsensusVote("XS", "M", "t-shirt")).toBe(false); // 2 steps away
    expect(isConsensusVote("XL", "M", "t-shirt")).toBe(false); // 2 steps away
    expect(isConsensusVote("XXL", "M", "t-shirt")).toBe(false); // 3 steps away
  });

  it("treats ? votes as never consensus", () => {
    expect(isConsensusVote("?", 5, "fibonacci")).toBe(false);
    expect(isConsensusVote("?", "M", "t-shirt")).toBe(false);
  });
});

describe("Vote Sorting", () => {
  it("sorts Fibonacci votes in ascending numeric order", () => {
    const votes = [
      { point_value: "13", id: "1" },
      { point_value: "3", id: "2" },
      { point_value: "8", id: "3" },
      { point_value: "5", id: "4" },
      { point_value: "?", id: "5" },
    ];

    const sorted = sortVotesByValue(votes, "fibonacci");
    expect(sorted.map(v => v.point_value)).toEqual(["3", "5", "8", "13", "?"]);
  });

  it("sorts T-shirt votes in predefined order", () => {
    const votes = [
      { point_value: "XL", id: "1" },
      { point_value: "S", id: "2" },
      { point_value: "XXL", id: "3" },
      { point_value: "M", id: "4" },
      { point_value: "?", id: "5" },
    ];

    const sorted = sortVotesByValue(votes, "t-shirt");
    expect(sorted.map(v => v.point_value)).toEqual(["S", "M", "XL", "XXL", "?"]);
  });

  it("places ? at the end for both scales", () => {
    const fibVotes = [
      { point_value: "?", id: "1" },
      { point_value: "5", id: "2" },
    ];
    expect(sortVotesByValue(fibVotes, "fibonacci")[1].point_value).toBe("?");

    const tshirtVotes = [
      { point_value: "?", id: "1" },
      { point_value: "M", id: "2" },
    ];
    expect(sortVotesByValue(tshirtVotes, "t-shirt")[1].point_value).toBe("?");
  });
});

describe("Vote Visibility Filtering", () => {
  it("shows current participant's unrevealed vote", () => {
    const votes = [
      { point_value: "5", is_revealed: false, participant_id: "user-1" },
      { point_value: "8", is_revealed: false, participant_id: "user-2" },
    ];

    const visible = filterVisibleVotes(votes, "user-1");
    expect(visible).toHaveLength(1);
    expect(visible[0].participant_id).toBe("user-1");
  });

  it("shows all revealed votes", () => {
    const votes = [
      { point_value: "5", is_revealed: true, participant_id: "user-1" },
      { point_value: "8", is_revealed: true, participant_id: "user-2" },
      { point_value: "13", is_revealed: true, participant_id: "user-3" },
    ];

    const visible = filterVisibleVotes(votes, "user-1");
    expect(visible).toHaveLength(3);
  });

  it("hides other participants' unrevealed votes", () => {
    const votes = [
      { point_value: "5", is_revealed: false, participant_id: "user-1" },
      { point_value: "8", is_revealed: false, participant_id: "user-2" },
      { point_value: "13", is_revealed: false, participant_id: "user-3" },
    ];

    const visible = filterVisibleVotes(votes, "user-1");
    expect(visible).toHaveLength(1);
    expect(visible[0].participant_id).toBe("user-1");
  });

  it("shows mix of own unrevealed and others' revealed votes", () => {
    const votes = [
      { point_value: "5", is_revealed: false, participant_id: "user-1" },
      { point_value: "8", is_revealed: true, participant_id: "user-2" },
      { point_value: "13", is_revealed: false, participant_id: "user-3" },
    ];

    const visible = filterVisibleVotes(votes, "user-1");
    expect(visible).toHaveLength(2);
    expect(visible.some(v => v.participant_id === "user-1")).toBe(true);
    expect(visible.some(v => v.participant_id === "user-2")).toBe(true);
    expect(visible.some(v => v.participant_id === "user-3")).toBe(false);
  });
});

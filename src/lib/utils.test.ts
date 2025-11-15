import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateRoomName,
  formatRoomCode,
  getParticipantId,
  getParticipantName,
  saveParticipantName,
  copyToClipboard,
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

import { describe, it, expect } from "vitest";
import {
  roomNameSchema,
  participantNameSchema,
  pointScaleSchema,
  createRoomSchema,
} from "./schemas";

describe("Room Creation Schemas", () => {
  describe("roomNameSchema", () => {
    it("should accept valid room names", () => {
      expect(roomNameSchema.parse("Purple-Elephant")).toBe("Purple-Elephant");
      expect(roomNameSchema.parse("  Jazzy-Giraffe  ")).toBe("Jazzy-Giraffe"); // trims whitespace
    });

    it("should reject empty or too long room names", () => {
      expect(() => roomNameSchema.parse("")).toThrow("Room name is required");
      expect(() => roomNameSchema.parse("   ")).toThrow("Room name is required");
      expect(() => roomNameSchema.parse("a".repeat(101))).toThrow(
        "Room name must be 100 characters or less"
      );
    });
  });

  describe("participantNameSchema", () => {
    it("should accept valid participant names with spaces", () => {
      expect(participantNameSchema.parse("John Smith")).toBe("John Smith");
      expect(participantNameSchema.parse("  Alice  ")).toBe("Alice"); // trims whitespace
    });

    it("should reject empty or too long participant names", () => {
      expect(() => participantNameSchema.parse("")).toThrow(
        "Participant name is required"
      );
      expect(() => participantNameSchema.parse("a".repeat(51))).toThrow(
        "Participant name must be 50 characters or less"
      );
    });
  });

  describe("pointScaleSchema", () => {
    it("should accept valid point scale values", () => {
      expect(pointScaleSchema.parse("fibonacci")).toBe("fibonacci");
      expect(pointScaleSchema.parse("t-shirt")).toBe("t-shirt");
    });

    it("should reject invalid point scale values", () => {
      expect(() => pointScaleSchema.parse("invalid")).toThrow();
      expect(() => pointScaleSchema.parse("")).toThrow();
    });
  });

  describe("createRoomSchema", () => {
    it("should validate complete valid form data", () => {
      const validData = {
        roomName: "Purple-Elephant",
        participantName: "John Smith",
        pointScale: "fibonacci" as const,
      };
      expect(createRoomSchema.parse(validData)).toEqual(validData);
    });

    it("should reject form data with invalid point scale", () => {
      const invalidData = {
        roomName: "Valid Room",
        participantName: "Valid Name",
        pointScale: "invalid-scale",
      };
      expect(() => createRoomSchema.parse(invalidData)).toThrow();
    });
  });
});

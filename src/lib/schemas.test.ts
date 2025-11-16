import { describe, it, expect } from "vitest";
import {
  roomNameSchema,
  participantNameSchema,
  pointScaleSchema,
  createRoomSchema,
  storyTitleSchema,
  storyDescriptionSchema,
  createStorySchema,
  fibonacciPointValues,
  tshirtPointValues,
  voteSchema,
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

describe("Story Creation Schemas", () => {
  describe("storyTitleSchema", () => {
    it("should accept valid story titles", () => {
      expect(storyTitleSchema.parse("User login feature")).toBe("User login feature");
      expect(storyTitleSchema.parse("  Fix bug #123  ")).toBe("Fix bug #123"); // trims whitespace
    });

    it("should reject empty or too long story titles", () => {
      expect(() => storyTitleSchema.parse("")).toThrow("Title is required");
      expect(() => storyTitleSchema.parse("   ")).toThrow("Title is required");
      expect(() => storyTitleSchema.parse("a".repeat(101))).toThrow(
        "Title must be 100 characters or less"
      );
    });
  });

  describe("storyDescriptionSchema", () => {
    it("should accept valid story descriptions", () => {
      const description = "As a user, I want to log in so that I can access my account.";
      expect(storyDescriptionSchema.parse(description)).toBe(description);
      expect(storyDescriptionSchema.parse("  Short desc  ")).toBe("Short desc"); // trims whitespace
    });

    it("should accept empty descriptions (optional)", () => {
      expect(storyDescriptionSchema.parse("")).toBe("");
      expect(storyDescriptionSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject too long descriptions", () => {
      expect(() => storyDescriptionSchema.parse("a".repeat(501))).toThrow(
        "Description must be 500 characters or less"
      );
    });
  });

  describe("createStorySchema", () => {
    it("should validate complete story form data", () => {
      const validData = {
        title: "User login feature",
        description: "Allow users to authenticate with email and password",
      };
      expect(createStorySchema.parse(validData)).toEqual(validData);
    });

    it("should validate story with no description", () => {
      const validData = {
        title: "User login feature",
      };
      const parsed = createStorySchema.parse(validData);
      expect(parsed.title).toBe("User login feature");
      expect(parsed.description).toBeUndefined();
    });
  });
});

describe("Vote Validation Schemas", () => {
  describe("fibonacciPointValues", () => {
    it("should accept all valid Fibonacci values", () => {
      expect(fibonacciPointValues.parse("1")).toBe("1");
      expect(fibonacciPointValues.parse("2")).toBe("2");
      expect(fibonacciPointValues.parse("3")).toBe("3");
      expect(fibonacciPointValues.parse("5")).toBe("5");
      expect(fibonacciPointValues.parse("8")).toBe("8");
      expect(fibonacciPointValues.parse("13")).toBe("13");
      expect(fibonacciPointValues.parse("21")).toBe("21");
      expect(fibonacciPointValues.parse("?")).toBe("?");
    });

    it("should reject invalid Fibonacci values", () => {
      expect(() => fibonacciPointValues.parse("4")).toThrow();
      expect(() => fibonacciPointValues.parse("100")).toThrow();
      expect(() => fibonacciPointValues.parse("")).toThrow();
    });
  });

  describe("tshirtPointValues", () => {
    it("should accept all valid T-shirt values", () => {
      expect(tshirtPointValues.parse("XS")).toBe("XS");
      expect(tshirtPointValues.parse("S")).toBe("S");
      expect(tshirtPointValues.parse("M")).toBe("M");
      expect(tshirtPointValues.parse("L")).toBe("L");
      expect(tshirtPointValues.parse("XL")).toBe("XL");
      expect(tshirtPointValues.parse("XXL")).toBe("XXL");
      expect(tshirtPointValues.parse("?")).toBe("?");
    });

    it("should reject invalid T-shirt values", () => {
      expect(() => tshirtPointValues.parse("XXXL")).toThrow();
      expect(() => tshirtPointValues.parse("small")).toThrow();
      expect(() => tshirtPointValues.parse("")).toThrow();
    });
  });

  describe("voteSchema", () => {
    it("should accept valid point values", () => {
      expect(voteSchema.parse({ pointValue: "5" })).toEqual({ pointValue: "5" });
      expect(voteSchema.parse({ pointValue: "XL" })).toEqual({ pointValue: "XL" });
      expect(voteSchema.parse({ pointValue: "?" })).toEqual({ pointValue: "?" });
    });

    it("should reject empty point values", () => {
      expect(() => voteSchema.parse({ pointValue: "" })).toThrow(
        "Please select a point value"
      );
    });
  });
});

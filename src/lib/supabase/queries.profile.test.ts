/**
 * Tests for profile query functions
 *
 * Focused tests covering:
 * - Get profile by user ID
 * - Create new profile
 * - Update profile display name
 * - Link anonymous participants to authenticated user
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProfile,
  createProfile,
  updateProfile,
  linkParticipantsToUser,
  DatabaseError,
} from "./queries";
import { supabase } from "./client";

// Mock the Supabase client
vi.mock("./client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("Profile Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return profile when found", async () => {
      const mockProfile = {
        id: "profile-123",
        user_id: "user-456",
        display_name: "John Doe",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getProfile("user-456");

      expect(result).toEqual(mockProfile);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
    });

    it("should return null when profile not found", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getProfile("nonexistent-user");

      expect(result).toBeNull();
    });
  });

  describe("createProfile", () => {
    it("should create profile successfully", async () => {
      const mockProfile = {
        id: "profile-789",
        user_id: "user-123",
        display_name: "Jane Smith",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createProfile("user-123", "Jane Smith");

      expect(result).toEqual(mockProfile);
      expect(result.display_name).toBe("Jane Smith");
    });

    it("should throw DatabaseError when creation fails", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Duplicate key error", code: "23505" },
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(createProfile("user-123", "Jane Smith")).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe("updateProfile", () => {
    it("should update profile display name successfully", async () => {
      const mockProfile = {
        id: "profile-456",
        user_id: "user-789",
        display_name: "Updated Name",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateProfile("user-789", "Updated Name");

      expect(result).toEqual(mockProfile);
      expect(result.display_name).toBe("Updated Name");
    });
  });

  describe("linkParticipantsToUser", () => {
    it("should link participants to authenticated user", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(
        linkParticipantsToUser("local-id-123", "user-456")
      ).resolves.not.toThrow();

      expect(mockFrom).toHaveBeenCalledWith("participants");
    });

    it("should throw DatabaseError when linking fails", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Foreign key violation", code: "23503" },
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(
        linkParticipantsToUser("local-id-123", "invalid-user")
      ).rejects.toThrow(DatabaseError);
    });
  });
});

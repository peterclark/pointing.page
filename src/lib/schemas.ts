import { z } from "zod";

/**
 * Room name validation schema
 * - Min 1 character (after trimming)
 * - Max 100 characters
 * - Automatically trims whitespace
 */
export const roomNameSchema = z
  .string()
  .trim()
  .min(1, "Room name is required")
  .max(100, "Room name must be 100 characters or less");

/**
 * Participant name validation schema
 * - Required field
 * - Min 1 character (after trimming)
 * - Max 50 characters
 * - Allows spaces and alphanumeric characters
 * - Automatically trims whitespace
 */
export const participantNameSchema = z
  .string()
  .trim()
  .min(1, "Participant name is required")
  .max(50, "Participant name must be 50 characters or less");

/**
 * Point scale enum schema
 * - Only allows "fibonacci" or "t-shirt" values
 * - Maps to database point_scale_enum type
 */
export const pointScaleSchema = z.enum(["fibonacci", "t-shirt"], {
  required_error: "Please select a point scale",
});

/**
 * Complete room creation form schema
 * Combines room name, participant name, and point scale validation
 */
export const createRoomSchema = z.object({
  roomName: roomNameSchema,
  participantName: participantNameSchema,
  pointScale: pointScaleSchema,
});

/**
 * TypeScript type inferred from createRoomSchema
 * Use this type for form data typing
 */
export type CreateRoomFormData = z.infer<typeof createRoomSchema>;

/**
 * Story title validation schema
 * - Required field
 * - Min 1 character (after trimming)
 * - Max 100 characters
 * - Automatically trims whitespace
 */
export const storyTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(100, "Title must be 100 characters or less");

/**
 * Story description validation schema
 * - Optional field
 * - Max 500 characters
 * - Automatically trims whitespace
 */
export const storyDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Description must be 500 characters or less")
  .optional();

/**
 * Complete story creation form schema
 * Combines title and optional description validation
 */
export const createStorySchema = z.object({
  title: storyTitleSchema,
  description: storyDescriptionSchema,
});

/**
 * TypeScript type inferred from createStorySchema
 * Use this type for form data typing
 */
export type CreateStoryFormData = z.infer<typeof createStorySchema>;

/**
 * Fibonacci point values enum
 * Includes standard Fibonacci sequence plus "?" for pass/don't know
 */
export const fibonacciPointValues = z.enum([
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "?",
]);

/**
 * T-shirt size point values enum
 * Includes standard sizes plus "?" for pass/don't know
 */
export const tshirtPointValues = z.enum([
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "?",
]);

/**
 * Vote validation schema
 * Point value must be a string matching the room's point scale
 * Actual validation against the specific scale happens at the component level
 */
export const voteSchema = z.object({
  pointValue: z.string().min(1, "Please select a point value"),
});

/**
 * TypeScript type inferred from voteSchema
 * Use this type for vote form data typing
 */
export type VoteFormData = z.infer<typeof voteSchema>;

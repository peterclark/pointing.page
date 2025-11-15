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

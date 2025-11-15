/**
 * FormErrorMessage Component
 *
 * A reusable component for displaying inline form validation errors
 * from react-hook-form with zod validation.
 *
 * Usage with react-hook-form:
 * ```tsx
 * import { useForm } from "react-hook-form";
 * import { zodResolver } from "@hookform/resolvers/zod";
 * import { createRoomSchema } from "@/lib/schemas";
 *
 * const { register, formState: { errors } } = useForm({
 *   resolver: zodResolver(createRoomSchema)
 * });
 *
 * <Input {...register("roomName")} />
 * {errors.roomName && <FormErrorMessage message={errors.roomName.message} />}
 * ```
 */

interface FormErrorMessageProps {
  message?: string;
}

export function FormErrorMessage({ message }: FormErrorMessageProps) {
  if (!message) return null;

  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

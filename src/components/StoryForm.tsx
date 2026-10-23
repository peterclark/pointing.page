import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { feltField, ivoryButton } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createStorySchema, type CreateStoryFormData } from "@/lib/schemas";
import { createStory, setActiveStory } from "@/lib/supabase/queries";
import { toast } from "sonner";

interface StoryFormProps {
  roomId: string;
  onStoryCreated?: () => void;
}

/**
 * Story Creation Form Component
 *
 * Leader-only form for creating a new story to vote on.
 * Features:
 * - Title field (required, max 100 chars)
 * - Description field (optional, max 500 chars)
 * - Form validation using zod schemas
 * - Automatic story activation after creation
 * - Loading states and error handling
 */
export function StoryForm({ roomId, onStoryCreated }: StoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStoryFormData>({
    resolver: zodResolver(createStorySchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreateStoryFormData) => {
    setIsSubmitting(true);

    try {
      // Create the story
      const story = await createStory(roomId, data.title, data.description);

      // Activate the story so voting can begin
      await setActiveStory(story.id);

      // Clear form
      reset();

      // Notify parent component
      onStoryCreated?.();

      toast.success("Story created! Voting has started.");
    } catch (_error) {
      toast.error("Failed to create story. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="story-form-heading">
      <div className="space-y-2">
        <h2
          id="story-form-heading"
          className="font-display text-[2.5rem] leading-none sm:text-5xl"
        >
          Deal a story
        </h2>
        <p className="text-ivory/80">
          Name what the team is estimating, then everyone picks a card.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Story Title <span className="text-suit">*</span>
          </Label>
          <Input
            id="title"
            {...register("title")}
            disabled={isSubmitting}
            placeholder="Enter story title"
            className={cn("h-14", feltField)}
          />
          {errors.title && (
            <p className="text-sm text-gold">{errors.title.message}</p>
          )}
        </div>

        {/* Description Textarea */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            {...register("description")}
            disabled={isSubmitting}
            placeholder="Enter story description or acceptance criteria (Cmd+Enter to submit)"
            rows={4}
            className={cn("py-3", feltField)}
            onKeyDown={(e) => {
              // Submit form on Cmd+Enter or Ctrl+Enter
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submitButtonRef.current?.click();
              }
            }}
          />
          {errors.description && (
            <p className="text-sm text-gold">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          ref={submitButtonRef}
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className={cn("w-full", ivoryButton)}
          tabIndex={0}
        >
          {isSubmitting ? "Creating..." : "Start Voting"}
        </Button>
      </form>
    </section>
  );
}

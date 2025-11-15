import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoomSchema, type CreateRoomFormData } from "@/lib/schemas";
import {
  generateRoomName,
  getParticipantId,
  getParticipantName,
  saveParticipantName,
} from "@/lib/utils";
import { createRoom, joinRoom } from "@/lib/supabase/queries";
import { toast } from "sonner";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Room Dialog Component
 *
 * Modal dialog for creating a new story pointing room.
 * Features:
 * - Pre-populated room name (editable)
 * - Participant name input (pre-filled from localStorage if available)
 * - Point scale selection (Fibonacci or T-shirt)
 * - Point scale buttons disabled until participant name is entered
 * - Form validation using zod schemas
 * - Automatic room creation and navigation on submission
 */
export function CreateRoomDialog({
  open,
  onOpenChange,
}: CreateRoomDialogProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRoomFormData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      roomName: generateRoomName(),
      participantName: getParticipantName() || "",
      pointScale: undefined,
    },
  });

  // Watch participant name to enable/disable point scale buttons
  const participantName = watch("participantName");
  const isNameEntered = participantName && participantName.trim().length > 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        roomName: generateRoomName(),
        participantName: getParticipantName() || "",
        pointScale: undefined,
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateRoomFormData) => {
    setIsSubmitting(true);

    try {
      // Create the room
      const room = await createRoom(data.roomName, data.pointScale);

      // Save participant name to localStorage
      saveParticipantName(data.participantName);

      // Join the room as the first participant (becomes leader)
      // Pass null for userId since this is an anonymous user
      const participant = await joinRoom(room.id, null, data.participantName);

      // Save the participant's database ID to localStorage for future room access
      localStorage.setItem('participant_id', participant.id);

      // Close dialog immediately
      onOpenChange(false);

      // Navigate to the room
      navigate(`/room/${room.room_code}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handlePointScaleClick = (scale: "fibonacci" | "t-shirt") => {
    if (!isNameEntered) return;

    setValue("pointScale", scale);
    handleSubmit(onSubmit)();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create a Room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Room Name Input */}
          <div className="space-y-2">
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              {...register("roomName")}
              disabled={isSubmitting}
              placeholder="Enter room name"
            />
            {errors.roomName && (
              <p className="text-sm text-destructive">
                {errors.roomName.message}
              </p>
            )}
          </div>

          {/* Participant Name Input */}
          <div className="space-y-2">
            <Label htmlFor="participantName">
              Your Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="participantName"
              {...register("participantName")}
              disabled={isSubmitting}
              placeholder="Enter your name"
            />
            {errors.participantName && (
              <p className="text-sm text-destructive">
                {errors.participantName.message}
              </p>
            )}
          </div>

          {/* Point Scale Selection */}
          <div className="space-y-3">
            <Label>Point Scale</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!isNameEntered || isSubmitting}
                onClick={() => handlePointScaleClick("fibonacci")}
                className="h-24 text-lg font-semibold"
              >
                Fibonacci
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  1, 2, 3, 5, 8, 13...
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!isNameEntered || isSubmitting}
                onClick={() => handlePointScaleClick("t-shirt")}
                className="h-24 text-lg font-semibold"
              >
                T-shirt
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  XS, S, M, L, XL...
                </span>
              </Button>
            </div>
            {errors.pointScale && (
              <p className="text-sm text-destructive">
                {errors.pointScale.message}
              </p>
            )}
            {!isNameEntered && (
              <p className="text-sm text-muted-foreground">
                Enter your name to select a point scale
              </p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

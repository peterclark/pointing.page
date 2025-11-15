import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { toast } from "sonner";

/**
 * Landing Page Component
 *
 * Displays a centered "Create Room" button that opens the room creation dialog.
 * This is the entry point for users who want to start a new story pointing session.
 * Also displays error toasts if navigated here with an error message.
 */
export function LandingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const location = useLocation();
  const hasShownToast = useRef(false);

  // Display error toast if navigated here with error state
  useEffect(() => {
    if (location.state?.error && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error(location.state.error);
      // Clear the state so toast doesn't show again on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Story Pointer</h1>
          <p className="mt-2 text-muted-foreground">
            Create a room to start estimating stories with your team
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setIsDialogOpen(true)}
          className="min-w-[200px]"
        >
          Create Room
        </Button>
      </div>

      <CreateRoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}

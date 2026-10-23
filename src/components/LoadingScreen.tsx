import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PlayingCard } from "@/components/PlayingCard";
import { fanStyle } from "@/lib/cards";

interface LoadingScreenProps {
  /**
   * Determines the message text:
   * - true: "Creating your room..."
   * - false: "Joining your room..."
   */
  isCreating: boolean;

  /**
   * Callback fired after pulse animation completes
   * (1 second after progress reaches 100% AND dbOperationComplete is true)
   * OR immediately after error is set with dbOperationComplete
   */
  onComplete: () => void;

  /**
   * Controls whether the component is rendered
   */
  isLoading: boolean;

  /**
   * Indicates database operation has completed successfully
   * Pulse animation only triggers when this is true AND progress = 100%
   */
  dbOperationComplete?: boolean;

  /**
   * Error message to display
   * When provided, shows error and triggers completion flow after timer
   */
  error?: string | null;
}

/**
 * LoadingScreen Component
 *
 * Full-page loading screen with timer-based progress animation.
 * Features:
 * - 5-second progress animation (0% to 100%)
 * - Context-aware messaging (creating vs joining)
 * - 1-second pulse animation on completion
 * - Error handling with visual feedback
 * - Full-page centered layout
 */
export function LoadingScreen({
  isCreating,
  onComplete,
  isLoading,
  dbOperationComplete = false,
  error = null,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  // Timer-based progress animation (2.5 seconds, 50ms intervals)
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // Increment by 2% every 50ms = 2.5 seconds total
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Trigger pulse animation and completion when conditions are met
  useEffect(() => {
    // Success case: pulse when progress is 100% AND database operation is complete
    if (progress === 100 && dbOperationComplete && !error) {
      setIsPulsing(true);

      // After 1 second pulse, call onComplete
      const pulseTimeout = setTimeout(() => {
        onComplete();
      }, 1000);

      return () => clearTimeout(pulseTimeout);
    }

    // Error case: pulse when progress is 100% AND error is set
    if (progress === 100 && dbOperationComplete && error) {
      setIsPulsing(true);

      // After 1 second pulse, call onComplete
      const pulseTimeout = setTimeout(() => {
        onComplete();
      }, 1000);

      return () => clearTimeout(pulseTimeout);
    }
  }, [progress, dbOperationComplete, error, onComplete]);

  if (!isLoading) return null;

  const message = isCreating ? "Creating your room..." : "Joining your room...";

  return (
    <div className="felt dark fixed inset-0 z-50 flex items-center justify-center">
      <div className="w-full max-w-[420px] px-6">
        {/* Three cards being dealt, purely decorative */}
        <div aria-hidden="true" className="relative mx-auto mb-8 h-[110px] w-[150px]">
          {[0, 1, 2].map((index) => (
            <PlayingCard
              key={index}
              style={{ ...fanStyle(index, 3, { tilt: 10, dip: 4 }), left: `${index * 28}px` }}
              className={cn(
                "fan-card absolute top-0 h-[100px] w-[72px]",
                isPulsing && "animate-pulse"
              )}
            />
          ))}
        </div>

        {/* Message and Percentage Row */}
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="font-display text-2xl">{message}</p>
          <p className="font-extrabold tabular-nums text-ivory/80">{progress}%</p>
        </div>

        {/* Progress Bar */}
        <Progress
          value={progress}
          className={cn(
            "h-3 bg-ivory/15 transition-all duration-200 *:data-[slot=progress-indicator]:bg-gold",
            isPulsing && "animate-pulse"
          )}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-2xl bg-suit/25 p-4">
            <p className="text-sm text-ivory">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

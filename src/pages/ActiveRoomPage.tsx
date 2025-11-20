import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatRoomCode,
  copyToClipboard,
  filterVisibleVotes,
  getParticipantName,
  saveParticipantName,
} from "@/lib/utils";
import { getRoomByCode, joinRoom } from "@/lib/supabase/queries";
import type { Tables } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRoomSubscription } from "@/hooks/useRoomSubscription";
import { StoryForm } from "@/components/StoryForm";
import { VotingButtons } from "@/components/VotingButtons";
import { ParticipantStatus } from "@/components/ParticipantStatus";
import { VoteResults } from "@/components/VoteResults";
import { LeaderControls } from "@/components/LeaderControls";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Active Room Page Component
 *
 * Main room interface orchestrating the complete voting workflow.
 *
 * Features:
 * - Real-time updates via useRoomSubscription hook
 * - Vote privacy enforcement (participants only see their own unrevealed votes)
 * - Conditional rendering based on story state:
 *   - No active story: StoryForm (leader only) or waiting message
 *   - Active story + not revealed: Voting interface
 *   - Active story + revealed: Results display
 * - Leader controls for reveal and next story
 * - Participant identification via localStorage
 * - Responsive layout for mobile/tablet/desktop
 *
 * State Machine:
 * 1. No Active Story → Leader sees form, others see waiting message
 * 2. Active Story (not revealed) → All see voting buttons and participant status
 * 3. Active Story (revealed) → All see results, leader sees "Next Story" button
 */
export function ActiveRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Tables<"rooms"> | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  // Get participant ID from localStorage (reactive - updates when localStorage changes)
  const [participantId, setParticipantId] = useState<string>("");

  useEffect(() => {
    // Get the participant ID from localStorage, or the generated one
    const id = localStorage.getItem("participant_id") || "";
    setParticipantId(id);
  }, []); // Only run once on mount

  // Validate room exists on mount
  useEffect(() => {
    const validateRoom = async () => {
      if (!roomCode) {
        navigate("/", { state: { error: "Invalid room code" } });
        return;
      }

      // Normalize room code
      const normalizedCode = roomCode.toUpperCase().trim();

      // Validate format (8 alphanumeric characters)
      const alphanumericRegex = /^[A-Z0-9]{8}$/;
      if (!alphanumericRegex.test(normalizedCode)) {
        navigate("/", { state: { error: "Invalid room code format" } });
        return;
      }

      try {
        const roomData = await getRoomByCode(normalizedCode);

        if (!roomData) {
          navigate("/", { state: { error: "Room not found" } });
          return;
        }

        setRoom(roomData);
      } catch (_error) {
        navigate("/", {
          state: { error: "Failed to load room. Please try again." },
        });
      } finally {
        setIsLoadingRoom(false);
      }
    };

    validateRoom();
  }, [roomCode, navigate]);

  // Subscribe to room data (only after room is loaded)
  const {
    stories,
    votes,
    participants,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    isReconnecting,
  } = useRoomSubscription(room?.id || "");

  // State for joining the room
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinName, setJoinName] = useState(getParticipantName() || "");
  const [isJoining, setIsJoining] = useState(false);

  // Find current participant in the room
  const currentParticipant = useMemo(
    () => participants.find((p) => p.id === participantId),
    [participants, participantId]
  );

  // Show toast when reconnecting
  useEffect(() => {
    if (isReconnecting) {
      toast.info("Connection lost. Reconnecting...", {
        duration: Infinity, // Keep showing until reconnected
        id: "reconnecting", // Use consistent ID so it doesn't duplicate
      });
    } else {
      // Dismiss reconnecting toast when connection restored
      toast.dismiss("reconnecting");
    }
  }, [isReconnecting]);

  // Check if participant is in the room
  useEffect(() => {
    if (
      !isLoadingRoom &&
      !isLoadingSubscription &&
      room &&
      !currentParticipant
    ) {
      // Participant not found in room or no participant ID - show join form
      setShowJoinForm(true);
    } else if (currentParticipant) {
      // Participant found - hide join form
      setShowJoinForm(false);
    }
  }, [
    isLoadingRoom,
    isLoadingSubscription,
    room,
    currentParticipant,
    participantId,
  ]);

  // Determine leader status
  const isLeader = currentParticipant?.is_leader ?? false;

  // Find active story
  const activeStory = useMemo(
    () => stories.find((s) => s.is_active) || null,
    [stories]
  );

  // Check if active story votes are revealed
  // We check if any vote for the active story has is_revealed=true
  const isRevealed = useMemo(() => {
    if (!activeStory) return false;
    return votes.some((v) => v.story_id === activeStory.id && v.is_revealed);
  }, [activeStory, votes]);

  // Filter votes for privacy (participants only see their own unrevealed votes)
  const visibleVotes = useMemo(
    () => filterVisibleVotes(votes, participantId),
    [votes, participantId]
  );

  // Get current participant's vote
  const currentVote = useMemo(
    () =>
      visibleVotes.find((v) => v.participant_id === participantId)
        ?.point_value || null,
    [visibleVotes, participantId]
  );

  // Handle joining the room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !joinName.trim() || isJoining) return;

    setIsJoining(true);
    try {
      const participant = await joinRoom(room.id, null, joinName.trim());

      // Save participant ID and name to localStorage
      localStorage.setItem("participant_id", participant.id);
      saveParticipantName(joinName.trim());

      // Update the local participant ID state
      setParticipantId(participant.id);

      // Hide join form - participant will now be in the subscription data
      setShowJoinForm(false);
      toast.success("Successfully joined the room!");
    } catch (_error) {
      toast.error("Failed to join room. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  // Handle copy room code
  const handleCopyRoomCode = async () => {
    if (!roomCode) return;

    const shareableUrl = `${window.location.origin}/join/${roomCode}`;
    const success = await copyToClipboard(shareableUrl);

    if (success) {
      toast.success("Link copied to clipboard!", {
        duration: 3000,
      });
    } else {
      toast.error("Failed to copy. Please try manually.", {
        duration: 5000,
      });
    }
  };

  // Combined loading state
  const isLoading = isLoadingRoom || isLoadingSubscription;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Loading room...</p>
          <p className="text-muted-foreground text-sm mt-2">
            Connecting to real-time updates...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (subscriptionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="text-center space-y-4">
            <p className="text-destructive font-semibold">Connection Error</p>
            <p className="text-muted-foreground text-sm">
              {subscriptionError.message}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback if room is not loaded (shouldn't happen due to validation)
  if (!room || !roomCode) {
    return null;
  }

  const formattedCode = formatRoomCode(roomCode);

  // Show join form if participant is not a member
  if (showJoinForm) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-8">
        <div className="mx-auto max-w-md space-y-8">
          {/* Room Header */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-3xl font-bold">{room.name}</h1>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Room Code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
                  {formattedCode}
                </p>
              </div>
            </div>
          </Card>

          {/* Join Form */}
          <Card className="p-6">
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Join Room</h2>
                <p className="text-muted-foreground text-sm">
                  Enter your name to join this story pointing session
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinName">Your Name</Label>
                <Input
                  id="joinName"
                  type="text"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  disabled={isJoining}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!joinName.trim() || isJoining}
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Show main room content only if participant is a member
  if (!currentParticipant) {
    return null;
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Room Header Section */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Room Name */}
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold">{room.name}</h1>
            </div>

            {/* Room Code and Copy Button */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground">Room Code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
                  {formattedCode}
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <Button
                  onClick={handleCopyRoomCode}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                  Copy Link
                </Button>
                <ModeToggle />
              </div>
            </div>
          </div>
        </Card>

        {/* Voting Flow - Conditional Rendering Based on State */}
        <div className="space-y-6">
          {/* State 1: No Active Story */}
          {!activeStory && (
            <>
              {isLeader ? (
                // Leader sees story form
                <StoryForm roomId={room.id} />
              ) : (
                // Non-leaders see waiting message
                <Card className="p-8">
                  <div className="text-center text-muted-foreground space-y-2">
                    <p className="text-lg font-medium">
                      Waiting for leader to start voting
                    </p>
                    <p className="text-sm">
                      The leader will create a story for the team to estimate
                    </p>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* State 2 & 3: Active Story Exists */}
          {activeStory && (
            <>
              {/* Story Details */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {activeStory.title}
                    </h2>
                    {activeStory.description && (
                      <p className="text-muted-foreground mt-2">
                        {activeStory.description}
                      </p>
                    )}
                  </div>

                  {/* Participant Status */}
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Participants ({participants.length})
                    </p>
                    <ParticipantStatus
                      participants={participants}
                      votes={votes.filter((v) => v.story_id === activeStory.id)}
                      isRevealed={isRevealed}
                    />
                  </div>
                </div>
              </Card>

              {/* State 2: Active Story (Not Revealed) - Voting Interface */}
              {!isRevealed && (
                <Card className="p-6">
                  <div className="space-y-6">
                    <div className="sm:text-left flex">
                      <div>
                        <h3 className="text-xl font-semibold">
                          Cast Your Vote
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          Select your estimation for this story
                        </p>
                      </div>

                      {/* Leader Controls - Reveal Button */}
                      {isLeader && (
                        <div className="ml-auto flex justify-center sm:justify-end pt-4">
                          <LeaderControls
                            roomId={room.id}
                            storyId={activeStory.id}
                            isRevealed={false}
                            isLeader={true}
                          />
                        </div>
                      )}
                    </div>

                    <VotingButtons
                      storyId={activeStory.id}
                      participantId={participantId}
                      pointScale={room.point_scale}
                      currentVote={currentVote}
                      isRevealed={false}
                    />
                  </div>
                </Card>
              )}

              {/* State 3: Active Story (Revealed) - Results Display */}
              {isRevealed && (
                <>
                  {/* Vote Results */}
                  <VoteResults
                    votes={votes.filter((v) => v.story_id === activeStory.id)}
                    participants={participants}
                    pointScale={room.point_scale}
                  />

                  {/* Leader Controls - Next Story Button */}
                  {isLeader && (
                    <Card className="p-6">
                      <div className="flex justify-center sm:justify-end">
                        <LeaderControls
                          roomId={room.id}
                          storyId={activeStory.id}
                          isRevealed={true}
                          isLeader={true}
                        />
                      </div>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

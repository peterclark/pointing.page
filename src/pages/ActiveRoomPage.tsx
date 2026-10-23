import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ClipboardDocumentIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
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
import { useAuth } from "@/hooks/useAuth";
import { ensureSession, SESSION_ERROR } from "@/lib/supabase/auth";
import { StoryForm } from "@/components/StoryForm";
import { VotingButtons } from "@/components/VotingButtons";
import { ParticipantStatus } from "@/components/ParticipantStatus";
import { VoteResults } from "@/components/VoteResults";
import { LeaderControls } from "@/components/LeaderControls";
import { useCardTable } from "@/hooks/useCardTable";

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
  useCardTable();
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Tables<"rooms"> | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  // Identity comes from the session, not localStorage. The `participant_id` key
  // carried two incompatible meanings — a generated device id in one place, a
  // participants row id in another — and only ever tracked the most recent room.
  const { user } = useAuth();

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
    votedParticipantIds,
    participants,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    isReconnecting,
    refetch,
  } = useRoomSubscription(room?.id || "");

  // State for joining the room
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinName, setJoinName] = useState(getParticipantName() || "");
  const [isJoining, setIsJoining] = useState(false);

  // Find current participant in the room
  const currentParticipant = useMemo(
    () => (user ? participants.find((p) => p.user_id === user.id) : undefined),
    [participants, user]
  );

  // Votes are keyed by participant row, so vote lookups still need that id.
  const participantId = currentParticipant?.id ?? "";

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

  const leaderName = useMemo(
    () => participants.find((p) => p.is_leader && p.is_active)?.name ?? null,
    [participants]
  );

  // Find active story
  const activeStory = useMemo(
    () => stories.find((s) => s.is_active) || null,
    [stories]
  );

  // Reveal state lives on the story, so a story nobody voted on can still be
  // revealed and moved past.
  const isRevealed = Boolean(activeStory?.revealed_at);

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

    if (!user && !(await ensureSession())) {
      toast.error(SESSION_ERROR);
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(room.id, joinName.trim());

      // Room data is readable only by members, so the board loaded before
      // joining came back empty. Load it again now that we are in.
      refetch();

      // Remembered only to pre-fill the name field next time.
      saveParticipantName(joinName.trim());

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
  // The native share sheet is the natural way to send a link on phones.
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const handleShare = async () => {
    if (!roomCode || !room) return;
    try {
      await navigator.share({
        title: `${room.name} · Pointing.page`,
        text: `Join "${room.name}" to point stories together`,
        url: `${window.location.origin}/join/${roomCode}`,
      });
    } catch (err) {
      // Dismissing the sheet rejects with AbortError; that is not a failure.
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Couldn't open sharing. Use Copy Link instead.");
      }
    }
  };

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
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="text-center">
          <p className="font-display text-3xl">Loading room...</p>
          <p className="mt-2 text-sm text-ivory/70">
            Connecting to real-time updates...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (subscriptionError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <Card className="max-w-md p-6">
          <div className="space-y-4 text-center">
            <p className="font-semibold text-destructive">Connection Error</p>
            <p className="text-sm text-muted-foreground">
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
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase">
            Table {formattedCode}
          </p>
          <h1 className="font-display mt-2 text-4xl leading-tight">
            {room.name}
          </h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Join Room</h2>
              <p className="text-sm text-muted-foreground">
                Enter your name to take a seat at this table
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
              className="h-12 w-full rounded-2xl font-extrabold"
              disabled={!joinName.trim() || isJoining}
            >
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Show main room content only if participant is a member
  if (!currentParticipant) {
    return null;
  }

  const storyVotes = activeStory
    ? votes.filter((v) => v.story_id === activeStory.id)
    : [];
  // Receipts say who has voted; the votes we can see (our own) are a floor.
  const votedIds = new Set([
    ...votedParticipantIds,
    ...storyVotes.map((v) => v.participant_id),
  ]);
  const votedCount = participants.filter((p) => votedIds.has(p.id)).length;
  const stillChoosing = participants
    .filter((p) => !votedIds.has(p.id))
    .map((p) => (p.id === participantId ? "you" : p.name));

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-5 pt-4 pb-10">
      {/* Top bar: room name beside the menu, code chip to share the table */}
      <header className="flex h-11 items-center gap-2 pl-12 min-[900px]:pl-0">
        <h1 className="font-display mr-auto truncate text-xl">{room.name}</h1>
        {canShare && (
          <Button
            onClick={handleShare}
            variant="ghost"
            size="icon"
            aria-label="Share"
            className="rounded-full text-ivory hover:bg-ivory/10 hover:text-ivory"
          >
            <ShareIcon className="h-5 w-5" />
          </Button>
        )}
        <Button
          onClick={handleCopyRoomCode}
          variant="ghost"
          aria-label={`Copy link to room ${formattedCode}`}
          className="gap-2 rounded-full bg-black/25 px-3 font-semibold tracking-wider text-ivory hover:bg-black/35 hover:text-ivory"
        >
          {formattedCode}
          <ClipboardDocumentIcon className="h-4 w-4" />
        </Button>
      </header>

      {/* Screen-reader announcement of the round's state */}
      <p className="sr-only" aria-live="polite">
        {activeStory
          ? isRevealed
            ? `Votes revealed for ${activeStory.title}`
            : `Voting open for ${activeStory.title}`
          : ""}
      </p>

      <div className="mt-6 space-y-8">
        {/* State 1: No Active Story */}
        {!activeStory &&
          (isLeader ? (
            <StoryForm roomId={room.id} />
          ) : (
            <div className="py-16 text-center">
              <p className="font-display text-3xl leading-tight">
                Waiting for {leaderName ?? "the leader"} to start voting
              </p>
              <p className="mt-3 text-sm text-ivory/70">
                The leader will deal a story for the team to estimate
              </p>
            </div>
          ))}

        {/* State 2 & 3: Active Story Exists */}
        {activeStory && (
          <>
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase">
                {isRevealed ? "Story · revealed" : "Story"}
              </p>
              <h2 className="font-display text-3xl leading-tight">
                {activeStory.title}
              </h2>
              {activeStory.description && (
                <p className="pt-1 text-ivory/75">{activeStory.description}</p>
              )}
            </div>

            {/* State 2: Active Story (Not Revealed) - Voting Interface */}
            {!isRevealed && (
              <>
                <div className="flex items-end gap-4">
                  <p className="text-[7rem] leading-[0.85] font-extrabold tracking-tighter sm:text-[8rem]">
                    {votedCount}
                    <span className="text-ivory/35">/{participants.length}</span>
                  </p>
                  <p className="pb-2 text-sm text-ivory/80">
                    cards down.
                    {stillChoosing.length > 0 && (
                      <>
                        <br />
                        Waiting on {formatNames(stillChoosing)}.
                      </>
                    )}
                  </p>
                </div>

                <ParticipantStatus
                  participants={participants}
                  votes={storyVotes}
                  votedParticipantIds={votedParticipantIds}
                  isRevealed={false}
                />

                <section aria-labelledby="your-hand" className="space-y-1">
                  <h3
                    id="your-hand"
                    className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase"
                  >
                    Your hand
                  </h3>
                  <VotingButtons
                    storyId={activeStory.id}
                    participantId={participantId}
                    pointScale={room.point_scale}
                    currentVote={currentVote}
                    isRevealed={false}
                  />
                </section>

                {isLeader && (
                  <LeaderControls
                    roomId={room.id}
                    storyId={activeStory.id}
                    isRevealed={false}
                    isLeader={true}
                  />
                )}
              </>
            )}

            {/* State 3: Active Story (Revealed) - Results Display */}
            {isRevealed && (
              <>
                <VoteResults
                  votes={storyVotes}
                  participants={participants}
                  pointScale={room.point_scale}
                />

                {isLeader && (
                  <LeaderControls
                    roomId={room.id}
                    storyId={activeStory.id}
                    isRevealed={true}
                    isLeader={true}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** "Ana", "Ana and Ben", "Ana, Ben and 2 others". */
function formatNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others`;
}

/**
 * ProfilePage Component
 *
 * Displays social authentication options for unauthenticated users
 * and profile management for authenticated users.
 *
 * Features:
 * - Unauthenticated: Social auth with Google and Github
 * - Authenticated: Display name editing, read-only email, OAuth profile picture
 * - Automatic account linking after OAuth authentication
 * - Pre-fills name from localStorage for OAuth metadata
 */

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginForm } from "@/components/login-form";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { PlayingCard } from "@/components/PlayingCard";
import { profileUpdateSchema, type ProfileUpdateFormData } from "@/lib/schemas";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "@/lib/supabase/queries";
import { useAuth } from "@/hooks/useAuth";
import { useCardTable } from "@/hooks/useCardTable";
import {
  getParticipantName,
  saveParticipantName,
} from "@/lib/utils";
import { toast } from "sonner";

/**
 * Profile page with conditional rendering based on auth state
 */
export function ProfilePage() {
  useCardTable();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Track if account linking has been attempted for this user
  const linkingAttemptedRef = useRef<string | null>(null);

  // Handle OAuth callback and account linking
  useEffect(() => {
    if (user && isAuthenticated && linkingAttemptedRef.current !== user.id) {
      linkingAttemptedRef.current = user.id;

      const handleAccountLinking = async () => {
        try {
          setIsLinking(true);

          const oauthName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            getParticipantName() ||
            "User";

          const existingProfile = await getProfile(user.id);

          if (!existingProfile) {
            // The handle_new_user trigger normally creates this; only reachable
            // for accounts predating the trigger.
            await createProfile(user.id, oauthName);
          } else if (/^Guest [0-9a-f]{8}$/.test(existingProfile.display_name)) {
            // Signing in upgrades the anonymous identity in place, so the
            // profile still carries the placeholder the trigger assigned.
            // Participants stay linked precisely because the uid did not change.
            await updateProfile(user.id, oauthName);
          } else {
            return;
          }

          localStorage.removeItem("pending_profile_name");
          toast.success("Signed in successfully!");
        } catch (error) {
          console.error("[ProfilePage] Error during account setup:", error);
          toast.error("Failed to set up account. Please try again.");
        } finally {
          setIsLinking(false);
        }
      };

      handleAccountLinking();
    }
  }, [user, isAuthenticated]);

  if (isAuthLoading) {
    return <StatusMessage>Loading...</StatusMessage>;
  }

  if (isLinking) {
    return <StatusMessage>Setting up your account...</StatusMessage>;
  }

  if (!isAuthenticated) {
    return <UnauthenticatedView />;
  }

  return (
    <AuthenticatedView
      user={user!}
      isSubmitting={isSubmitting}
      setIsSubmitting={setIsSubmitting}
      isLoadingProfile={isLoadingProfile}
      setIsLoadingProfile={setIsLoadingProfile}
    />
  );
}

/**
 * The felt page with the wordmark on top, shared by every state of this page
 */
function TablePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-4 pb-10">
      <p className="font-display flex h-11 items-center justify-center text-2xl">
        Pointing<span className="text-suit">.</span>page
      </p>
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-8">
        {children}
      </main>
    </div>
  );
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <TablePage>
      <p className="text-center text-ivory/70">{children}</p>
    </TablePage>
  );
}

// Matches the room code input on the landing page
const feltInput =
  "h-13 rounded-2xl border-2 border-ivory/30 bg-felt-deep/40 px-4 text-base text-ivory placeholder:text-ivory/50";

/**
 * Social authentication view for unauthenticated users
 */
function UnauthenticatedView() {
  return (
    <TablePage>
      {/* A card face down and one turned up, purely decorative */}
      <div aria-hidden="true" className="relative mx-auto h-[150px] w-[180px]">
        <PlayingCard
          className="absolute top-2 left-4 h-[132px] w-[94px] -rotate-8"
        />
        <PlayingCard
          value="?"
          red
          className="absolute top-0 right-4 h-[132px] w-[94px] rotate-6"
        />
      </div>

      <div className="space-y-3 text-center">
        <h1 className="font-display text-[2.5rem] leading-none sm:text-5xl">
          Take a seat.
        </h1>
        <p className="text-balance text-ivory/80">
          Sign in with Google or GitHub to keep your name and rooms on every
          device.
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-ivory/60">
        No account needed to play. You can keep going as a guest.
      </p>
    </TablePage>
  );
}

/**
 * Profile display and editing for authenticated users
 */
function AuthenticatedView({
  user,
  isSubmitting,
  setIsSubmitting,
  isLoadingProfile,
  setIsLoadingProfile,
}: {
  user: User;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  isLoadingProfile: boolean;
  setIsLoadingProfile: (loading: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
  });

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setValue("name", profile.display_name);
        }
      } catch (error) {
        console.error("[ProfilePage] Error loading profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user.id, setValue, setIsLoadingProfile]);

  const onSubmit = async (data: ProfileUpdateFormData) => {
    setIsSubmitting(true);

    try {
      await updateProfile(user.id, data.name);

      // Update localStorage for future participant records
      saveParticipantName(data.name);

      toast.success("Profile updated");
    } catch (error) {
      console.error("[ProfilePage] Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return <StatusMessage>Loading profile...</StatusMessage>;
  }

  return (
    <TablePage>
      <div className="flex flex-col items-center gap-4 text-center">
        <CurrentUserAvatar className="size-20 text-2xl font-extrabold shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-4 ring-ivory *:data-[slot=avatar-fallback]:bg-ivory *:data-[slot=avatar-fallback]:text-ink" />
        <div className="space-y-2">
          <h1 className="font-display text-[2.5rem] leading-none sm:text-5xl">
            Profile
          </h1>
          <p className="text-ivory/80">The name your team sees at the table</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Input (Editable) */}
        <div className="space-y-2">
          <Label htmlFor="profile-name">
            Name <span className="text-suit">*</span>
          </Label>
          <Input
            id="profile-name"
            {...register("name")}
            disabled={isSubmitting}
            placeholder="Enter your name"
            className={feltInput}
          />
          {errors.name && (
            <p className="text-sm text-gold">{errors.name.message}</p>
          )}
        </div>

        {/* Email Display (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email-display">Email</Label>
          <Input
            id="email-display"
            type="email"
            value={user.email || ""}
            disabled
            className={feltInput}
          />
          <p className="text-xs text-ivory/60">
            Email cannot be changed after verification
          </p>
        </div>

        {/* Save Button */}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-14 w-full rounded-2xl bg-ivory text-lg font-extrabold text-ink hover:bg-ivory/90"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </TablePage>
  );
}

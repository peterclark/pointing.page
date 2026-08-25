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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginForm } from "@/components/login-form";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { profileUpdateSchema, type ProfileUpdateFormData } from "@/lib/schemas";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "@/lib/supabase/queries";
import { useAuth } from "@/hooks/useAuth";
import {
  getParticipantName,
  saveParticipantName,
} from "@/lib/utils";
import { toast } from "sonner";
import Header from "@/components/Header";

/**
 * Profile page with conditional rendering based on auth state
 */
export function ProfilePage() {
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
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isLinking) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    );
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
 * Social authentication view for unauthenticated users
 */
function UnauthenticatedView() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Header />
      <Card className="p-6 mt-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold">Create Account</h2>
          <p className="text-muted-foreground mt-1">
            Sign in with Google or Github to get started
          </p>
        </div>

        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>
    </div>
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
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <p className="text-muted-foreground text-center">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Header />
      <Card className="p-6 mt-6">
        {/* User Avatar */}
        <div className="flex justify-center mb-6">
          <CurrentUserAvatar />
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold">Profile</h2>
          <p className="text-muted-foreground mt-1">
            Manage your account settings
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Name Input (Editable) */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-name"
              {...register("name")}
              disabled={isSubmitting}
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed after verification
            </p>
          </div>

          {/* Save Button */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

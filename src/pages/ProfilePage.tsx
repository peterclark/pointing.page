/**
 * ProfilePage Component
 *
 * Displays account creation form for unauthenticated users
 * and profile management for authenticated users.
 *
 * Features:
 * - Unauthenticated: Name + email form with magic link authentication
 * - Authenticated: Display name editing, read-only email
 * - Automatic account linking after magic link verification
 * - Pre-fills name from localStorage
 */

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accountCreationSchema,
  profileUpdateSchema,
  type AccountCreationFormData,
  type ProfileUpdateFormData,
} from "@/lib/schemas";
import {
  getProfile,
  createProfile,
  updateProfile,
  linkParticipantsToUser,
} from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getParticipantName,
  getParticipantId,
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
  const [emailSent, setEmailSent] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Track if account linking has been attempted for this user
  const linkingAttemptedRef = useRef<string | null>(null);

  // Handle magic link verification and account linking
  useEffect(() => {
    if (user && isAuthenticated && linkingAttemptedRef.current !== user.id) {
      linkingAttemptedRef.current = user.id;

      // Check if this is a new login (from magic link)
      const handleAccountLinking = async () => {
        try {
          setIsLinking(true);

          // Check if profile exists
          const existingProfile = await getProfile(user.id);

          if (!existingProfile) {
            // Get pending name from localStorage
            const pendingName =
              localStorage.getItem("pending_profile_name") ||
              getParticipantName() ||
              "User";

            // Create profile
            await createProfile(user.id, pendingName);

            // Link anonymous participants to this user
            const localStorageId = getParticipantId();
            if (localStorageId) {
              try {
                await linkParticipantsToUser(localStorageId, user.id);
              } catch (error) {
                console.error(
                  "[ProfilePage] Failed to link participants:",
                  error
                );
                // Don't show error to user - linking is optional
              }
            }

            // Clear pending name
            localStorage.removeItem("pending_profile_name");

            toast.success("Email verified successfully!");
          }
        } catch (error) {
          console.error("[ProfilePage] Error during account linking:", error);
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
    return (
      <UnauthenticatedView
        emailSent={emailSent}
        setEmailSent={setEmailSent}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    );
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
 * Account creation form for unauthenticated users
 */
function UnauthenticatedView({
  emailSent,
  setEmailSent,
  isSubmitting,
  setIsSubmitting,
}: {
  emailSent: boolean;
  setEmailSent: (sent: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountCreationFormData>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: {
      name: getParticipantName() || "",
      email: "",
    },
  });

  const onSubmit = async (data: AccountCreationFormData) => {
    setIsSubmitting(true);

    try {
      // Store name in localStorage for account linking
      localStorage.setItem("pending_profile_name", data.name);

      // Send magic link with display name in user metadata
      // This ensures the database trigger creates the profile with the correct name
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
          data: {
            display_name: data.name,
          },
        },
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast.success("Check your email for verification link");
    } catch (error) {
      console.error("[ProfilePage] Magic link error:", error);
      toast.error("Failed to send verification email. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="p-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent a verification link to your email. Click the link to
              verify your account.
            </p>
            <p className="text-sm text-muted-foreground">
              The link will expire in 60 minutes.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card className="p-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold">Create Account</h2>
          <p className="text-muted-foreground mt-1">
            Enter your name and email to get started
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              disabled={isSubmitting}
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isSubmitting}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Sending..." : "Send Verification Link"}
          </Button>
        </form>
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

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialLogin = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // OAuth redirect will happen automatically, no need to manually redirect
      // Note: Display name will come from OAuth provider's metadata (user.user_metadata.full_name)
      // and account linking in ProfilePage will handle fallback to localStorage if needed
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isLoading}
          onClick={() => handleSocialLogin("google")}
        >
          {isLoading ? "Connecting..." : "Google"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isLoading}
          onClick={() => handleSocialLogin("github")}
        >
          {isLoading ? "Connecting..." : "GitHub"}
        </Button>
      </div>
    </div>
  );
}

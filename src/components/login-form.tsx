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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const options = { redirectTo: `${window.location.origin}/` };

      // Every visitor arrives holding an anonymous session, and their rooms are
      // keyed to that `auth.uid()`. Signing in with OAuth would mint a *new*
      // user and strand them. linkIdentity attaches the provider to the
      // identity they already have, so the uid — and every room they joined —
      // survives. Requires Manual Linking enabled in the Supabase dashboard;
      // see OAUTH_SETUP.md.
      const { error } = user?.is_anonymous
        ? await supabase.auth.linkIdentity({ provider, options })
        : await supabase.auth.signInWithOAuth({ provider, options });

      if (error) throw error;

      // The OAuth redirect happens on its own from here.
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

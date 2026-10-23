import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { rememberOAuthProvider, type OAuthProvider } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialLogin = async (provider: OAuthProvider) => {
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
      // see OAUTH_SETUP.md. A provider that already has an account can't be
      // linked; resumeSignInAfterLinkConflict() signs in to it on the way back.
      if (user?.is_anonymous) rememberOAuthProvider(provider);
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
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      {error && (
        <div className="rounded-2xl bg-suit/25 p-3 text-sm text-ivory">
          {error}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="h-14 w-full rounded-2xl bg-ivory text-lg font-extrabold text-ink hover:bg-ivory/90"
        disabled={isLoading}
        onClick={() => handleSocialLogin("google")}
      >
        <GoogleMark />
        {isLoading ? "Connecting..." : "Google"}
      </Button>

      <Button
        type="button"
        size="lg"
        variant="outline"
        className="h-14 w-full rounded-2xl border-2 border-ivory/40 bg-transparent text-lg font-extrabold text-ivory hover:bg-ivory/10"
        disabled={isLoading}
        onClick={() => handleSocialLogin("github")}
      >
        <Github aria-hidden="true" className="size-5" />
        {isLoading ? "Connecting..." : "GitHub"}
      </Button>
    </div>
  );
}

// Google's "G", drawn inline so the button needs no image request
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

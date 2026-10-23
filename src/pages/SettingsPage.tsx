/**
 * SettingsPage Component
 *
 * Preferences kept in this browser, available with or without an account:
 * - Default name: pre-fills the name field when creating or joining a room.
 *   Signed-in users edit their name on the Account page instead, which also
 *   saves it here, so they are pointed there rather than shown a second field.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { participantNameSchema } from "@/lib/schemas";
import { cn, getParticipantName, saveParticipantName } from "@/lib/utils";
import { feltField, ivoryButton } from "@/lib/cards";
import { TablePage } from "@/components/TablePage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState(() => getParticipantName() ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

  const onSaveName = (event: FormEvent) => {
    event.preventDefault();
    const result = participantNameSchema.safeParse(name);
    if (!result.success) {
      setNameError(result.error.issues[0].message);
      return;
    }
    setNameError(null);
    saveParticipantName(result.data);
    toast.success("Default name saved");
  };

  return (
    <TablePage>
      <div className="space-y-2 text-center">
        <h1 className="font-display text-[2.5rem] leading-none sm:text-5xl">
          Settings
        </h1>
        <p className="text-ivory/80">Saved in this browser</p>
      </div>

      {isAuthenticated ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Name</p>
          <p className="text-sm text-ivory/70">
            Your name comes from your account.{" "}
            <Link
              to="/profile"
              className="text-ivory underline underline-offset-4"
            >
              Change it on the Account page
            </Link>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={onSaveName} className="space-y-2">
          <Label htmlFor="default-name">Default name</Label>
          <p className="text-sm text-ivory/70">
            Pre-fills your name when you create or join a room.
          </p>
          <div className="flex gap-2">
            <Input
              id="default-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-invalid={Boolean(nameError)}
              className={cn("h-14", feltField)}
            />
            <Button type="submit" className={cn("px-6", ivoryButton)}>
              Save
            </Button>
          </div>
          {nameError && <p className="text-sm text-gold">{nameError}</p>}
        </form>
      )}
    </TablePage>
  );
}

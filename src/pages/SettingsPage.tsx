/**
 * SettingsPage Component
 *
 * Preferences kept in this browser, available with or without an account:
 * - Appearance: light, dark or system theme
 * - Default name: pre-fills the name field when creating or joining a room
 */

import { useState, type FormEvent } from "react";
import { LaptopMinimal, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme-provider";
import { participantNameSchema } from "@/lib/schemas";
import { cn, getParticipantName, saveParticipantName } from "@/lib/utils";
import { feltField, ivoryButton } from "@/lib/cards";
import { TablePage } from "@/components/TablePage";
import { toast } from "sonner";

const THEMES = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: LaptopMinimal },
] as const;

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
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

      <section className="space-y-2" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-sm font-medium">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className="h-12 rounded-2xl border-2 border-ivory/30 bg-transparent font-bold text-ivory hover:bg-ivory/10 aria-pressed:border-ivory aria-pressed:bg-ivory aria-pressed:text-ink"
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </section>

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
    </TablePage>
  );
}

/**
 * SettingsPage Component
 *
 * Preferences kept in this browser, available with or without an account:
 * - Appearance: light, dark or system theme
 * - Default name: pre-fills the name field when creating or joining a room
 */

import { useState, type FormEvent } from "react";
import { LaptopMinimal, MoonIcon, SunIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme-provider";
import { participantNameSchema } from "@/lib/schemas";
import { getParticipantName, saveParticipantName } from "@/lib/utils";
import { toast } from "sonner";
import Header from "@/components/Header";

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
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Header />
      <Card className="p-6 mt-6 space-y-8">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Saved in this browser
          </p>
        </div>

        <section className="space-y-2" aria-labelledby="appearance-heading">
          <h3 id="appearance-heading" className="text-sm font-medium">
            Appearance
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                type="button"
                variant={theme === value ? "default" : "outline"}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </section>

        <form onSubmit={onSaveName} className="space-y-2">
          <Label htmlFor="default-name">Default name</Label>
          <p className="text-sm text-muted-foreground">
            Pre-fills your name when you create or join a room.
          </p>
          <div className="flex gap-2">
            <Input
              id="default-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-invalid={Boolean(nameError)}
            />
            <Button type="submit">Save</Button>
          </div>
          {nameError && (
            <p className="text-sm text-destructive">{nameError}</p>
          )}
        </form>
      </Card>
    </div>
  );
}

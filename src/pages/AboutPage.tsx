/**
 * AboutPage Component
 *
 * What Pointing.page is and who built it, with a link to the builder's résumé
 * and to the source on GitHub.
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePage } from "@/components/TablePage";
import { cn } from "@/lib/utils";
import { ivoryButton } from "@/lib/cards";

export const RESUME_URL = "https://peterclark.us";
export const SOURCE_URL = "https://github.com/peterclark/pointing.page";

export function AboutPage() {
  return (
    <TablePage>
      <div className="space-y-2 text-center">
        <h1 className="font-display text-[2.5rem] leading-none sm:text-5xl">
          About
        </h1>
        <p className="text-ivory/80">Story pointing for agile teams</p>
      </div>

      <p className="text-ivory/90">
        Pointing.page lets a team estimate stories together in real time. Open
        a room, share the link, and everyone plays a card from a Fibonacci or
        T-shirt hand. Votes stay face down until the leader reveals them, so
        nobody anchors on the first number they see.
      </p>

      <div className="space-y-3 rounded-2xl border-2 border-ivory/30 bg-felt-deep/40 p-5">
        <p className="text-sm font-medium tracking-wide text-ivory/70 uppercase">
          Built by
        </p>
        <div>
          <p className="font-display text-2xl">Peter Clark</p>
          <p className="text-ivory/80">
            Senior Software Engineer, San Antonio, TX
          </p>
        </div>
        <p className="text-sm text-ivory/70">
          Built with React, TypeScript and Supabase.
        </p>
      </div>

      <div className="space-y-3">
        <Button asChild className={cn("w-full", ivoryButton)}>
          <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">
            View my résumé
            <ExternalLink />
          </a>
        </Button>
        <p className="text-center text-sm">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ivory underline underline-offset-4"
          >
            Source code on GitHub
          </a>
        </p>
      </div>
    </TablePage>
  );
}

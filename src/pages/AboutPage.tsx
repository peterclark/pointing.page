/**
 * AboutPage Component
 *
 * What Pointing.page is, with a quiet "Built by" credit linking to the
 * builder's website.
 */

import { TablePage } from "@/components/TablePage";

export const AUTHOR_URL = "https://peterclark.us";

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

      <p className="text-center text-sm text-ivory/80">
        Built by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ivory underline underline-offset-4"
        >
          Peter Clark
        </a>
      </p>
    </TablePage>
  );
}

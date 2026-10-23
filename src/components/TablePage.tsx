import { useCardTable } from "@/hooks/useCardTable";

/**
 * A plain page on the card table: the felt, the wordmark on top and a narrow
 * column centred below it. Used by the profile and settings pages.
 */
export function TablePage({ children }: { children: React.ReactNode }) {
  useCardTable();

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-4 pb-10">
      <p className="font-display flex h-11 items-center justify-center text-2xl">
        Pointing<span className="text-suit">.</span>page
      </p>
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-8">
        {children}
      </main>
    </div>
  );
}

import { useEffect } from "react";

/**
 * Lays the green card-table felt over the whole page while the calling page is
 * mounted.
 *
 * The classes go on <body> rather than the page's own wrapper so that the menu
 * in RootLayout and anything portalled out (dialogs, toasts) pick up the same
 * palette. The theme provider owns the light/dark class on <html>, so adding
 * `dark` here never fights it.
 */
export function useCardTable() {
  useEffect(() => {
    document.body.classList.add("felt", "dark");
    return () => {
      document.body.classList.remove("felt", "dark");
    };
  }, []);
}

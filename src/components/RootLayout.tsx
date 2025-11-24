/**
 * RootLayout Component
 *
 * Root layout wrapper for all pages in the application.
 * Includes persistent header with navigation.
 */

import { Outlet } from "react-router-dom";
import { AppMenu } from "./AppMenu";

/**
 * Root layout component with persistent header
 */
export function RootLayout() {
  return (
    <>
      <AppMenu />
      <Outlet />
    </>
  );
}

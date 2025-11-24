/**
 * RootLayout Component
 *
 * Root layout wrapper for all pages in the application.
 * Includes persistent header with navigation.
 */

import { Outlet } from "react-router-dom";
import ProfileButton from "./ProfileButton";
import HomeButton from "./HomeButton";
import { useLocation } from "react-router-dom";

/**
 * Root layout component with persistent header
 */
export function RootLayout() {
  const location = useLocation();
  return (
    <>
      {location.pathname !== "/" && <HomeButton />}
      {location.pathname !== "/profile" && <ProfileButton />}
      <Outlet />
    </>
  );
}

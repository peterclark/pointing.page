import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DoorClosed, MenuIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { RecentRoomsMenuItems } from "@/components/RecentRoomsMenuItems";
import { signOut } from "@/lib/supabase/auth";

// Support requests go to the public issue tracker.
const SUPPORT_URL = "https://github.com/peterclark/pointing.page/issues/new";

export function AppMenu() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { registerCommand, showHelp, openCreateRoomDialog } =
    useCommandPalette();
  const [isOpen, setIsOpen] = useState(false);

  // Sign out and navigate helper function
  const signOutAndNavigate = useCallback(
    async (page: string) => {
      try {
        await signOut();
        navigate(page);
      } catch (error) {
        console.error("Failed to log out:", error);
      }
    },
    [navigate]
  );

  // Add keyboard shortcut for ⌘/ to toggle menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect ⌘/ (Mac) or Ctrl+/ (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Register all keyboard shortcuts
  useEffect(() => {
    const cleanups = [
      // Navigation commands
      registerCommand({
        key: "h",
        description: "Home",
        action: () => navigate("/"),
        category: "navigation",
      }),
      registerCommand({
        key: "p",
        description: "Profile",
        action: () => navigate("/profile"),
        category: "navigation",
      }),
      registerCommand({
        key: "s",
        description: "Settings",
        action: () => navigate("/settings"),
        category: "navigation",
      }),

      // Room commands
      registerCommand({
        key: "r",
        description: "New Room",
        action: () => openCreateRoomDialog(),
        category: "room",
      }),

      // Help commands
      registerCommand({
        key: "?",
        description: "Keyboard shortcuts",
        action: () => showHelp(),
        category: "help",
      }),

      // Account commands
      registerCommand({
        key: "q",
        description: "Log out",
        action: () => signOutAndNavigate("/"),
        category: "account",
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [
    navigate,
    registerCommand,
    showHelp,
    openCreateRoomDialog,
    signOutAndNavigate,
  ]);

  return (
    <div className="fixed top-0 left-0 p-4 z-10">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="link" size="icon" className="text-foreground">
            {isAuthenticated ? <CurrentUserAvatar /> : <MenuIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {/* Sign In menu item for unauthenticated users */}
          {!isAuthenticated && (
            <>
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Sign In
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => navigate("/")}>
            Home
            <DropdownMenuShortcut>⌘K H</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              Account
              <DropdownMenuShortcut>⌘K P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              Settings
              <DropdownMenuShortcut>⌘K S</DropdownMenuShortcut>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                Admin
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rooms</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <RecentRoomsMenuItems userId={user?.id} />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => openCreateRoomDialog()}>
              <DoorClosed />
              New Room
              <DropdownMenuShortcut>⌘K R</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
              Support
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => showHelp()}>
            Keyboard shortcuts
            <DropdownMenuShortcut>⌘K ?</DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Log out menu item only for authenticated users */}
          {isAuthenticated && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOutAndNavigate("/")}>
                Log out
                <DropdownMenuShortcut>⌘K Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

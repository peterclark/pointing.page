import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DoorClosed,
  LaptopMinimal,
  MenuIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useNavigate } from "react-router-dom";
import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import { useAuth } from "@/hooks/useAuth";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { signOut } from "@/lib/supabase/auth";
import { toast } from "sonner";

export function AppMenu() {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { registerCommand, showHelp, openCreateRoomDialog } =
    useCommandPalette();
  const [isOpen, setIsOpen] = useState(false);

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
        key: "b",
        description: "Billing",
        action: () => toast.info("Billing page coming soon!"),
        category: "navigation",
      }),
      registerCommand({
        key: "s",
        description: "Settings",
        action: () => toast.info("Settings page coming soon!"),
        category: "navigation",
      }),

      // Room commands
      registerCommand({
        key: "r",
        description: "New Room",
        action: () => openCreateRoomDialog(),
        category: "room",
      }),

      // Theme commands
      registerCommand({
        key: "l",
        description: "Light theme",
        action: () => {
          setTheme("light");
          toast.success("Switched to light theme");
        },
        category: "theme",
      }),
      registerCommand({
        key: "d",
        description: "Dark theme",
        action: () => {
          setTheme("dark");
          toast.success("Switched to dark theme");
        },
        category: "theme",
      }),
      registerCommand({
        key: "t",
        description: "System theme",
        action: () => {
          setTheme("system");
          toast.success("Switched to system theme");
        },
        category: "theme",
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
  }, [navigate, setTheme, registerCommand, showHelp, openCreateRoomDialog]);

  const signOutAndNavigate = async (page: string) => {
    try {
      await signOut();
      navigate(page);
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <div className="fixed top-0 left-0 p-4 z-10">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="link" size="icon">
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
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rooms</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Active room here...</DropdownMenuItem>
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
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon />
              Light
              <DropdownMenuShortcut>⌘K L</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon />
              Dark
              <DropdownMenuShortcut>⌘K D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <LaptopMinimal />
              System
              <DropdownMenuShortcut>⌘K T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toast.info("Support page coming soon!")}
          >
            Support
          </DropdownMenuItem>
          <DropdownMenuItem>
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

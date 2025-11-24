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

export function AppMenu() {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  return (
    <div className="fixed top-0 left-0 p-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <MenuIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuGroup onClick={() => navigate("/profile")}>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Keyboard shortcuts
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rooms</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Active room here...</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <DoorClosed />
              New Room
              <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon />
              Light
              <DropdownMenuShortcut>⇧⌘L</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon />
              Dark
              <DropdownMenuShortcut>⇧⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <LaptopMinimal />
              System
              <DropdownMenuShortcut>⇧⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

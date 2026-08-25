/**
 * Tests for AppMenu component
 *
 * Focused tests covering:
 * - MenuIcon renders when unauthenticated
 * - Avatar renders when authenticated
 * - Sign In menu item appears when unauthenticated
 * - Log out menu item appears when authenticated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AppMenu } from "./AppMenu";
import * as useAuthModule from "@/hooks/useAuth";

// Stable spies, so the tests can assert on what the menu actually invoked.
// Inline factories would hand each render a fresh vi.fn() and nothing would be
// observable from the test body.
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setTheme: vi.fn(),
  registerCommand: vi.fn(() => vi.fn()),
  showHelp: vi.fn(),
  openCreateRoomDialog: vi.fn(),
  signOut: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/hooks/useAuth");
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: mocks.setTheme }),
}));
vi.mock("@/hooks/useCommandPalette", () => ({
  useCommandPalette: () => ({
    registerCommand: mocks.registerCommand,
    showHelp: mocks.showHelp,
    openCreateRoomDialog: mocks.openCreateRoomDialog,
  }),
}));
vi.mock("@/lib/supabase/auth", () => ({ signOut: mocks.signOut }));
vi.mock("sonner", () => ({
  toast: { info: mocks.toastInfo, success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/components/current-user-avatar", () => ({
  CurrentUserAvatar: () => <div data-testid="user-avatar">Avatar</div>,
}));

describe("AppMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated State", () => {
    it("should render MenuIcon when unauthenticated", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // MenuIcon should be present (lucide-react renders as svg)
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      // Avatar should NOT be present
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
    });

    it("should show Sign In menu item when unauthenticated", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown by clicking the button
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for Sign In menu item to appear
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });
    });

    it("should NOT show Log out menu item when unauthenticated", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });

      // Log out menu item should NOT be present
      expect(screen.queryByText("Log out")).not.toBeInTheDocument();
    });
  });

  describe("Authenticated State", () => {
    it("should render Avatar when authenticated", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Avatar should be present
      expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    });

    it("should show Log out menu item when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown by clicking the button
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for Log out menu item to appear
      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });
    });

    it("should NOT show Sign In menu item when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });

      // Sign In menu item should NOT be present
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });
  });

  describe("Menu actions", () => {
    /** Open the menu and return a helper for clicking one of its items. */
    async function openMenu(authenticated = false) {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: authenticated ? ({ id: "user-1" } as never) : null,
        session: null,
        isAuthenticated: authenticated,
        isAnonymous: !authenticated,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      await userEvent.click(screen.getByRole("button"));
      return (name: string | RegExp) =>
        userEvent.click(screen.getByRole("menuitem", { name }));
    }

    it("navigates home", async () => {
      const click = await openMenu();
      await click(/^Home/);

      expect(mocks.navigate).toHaveBeenCalledWith("/");
    });

    it("navigates to the account page", async () => {
      const click = await openMenu();
      await click(/^Account/);

      expect(mocks.navigate).toHaveBeenCalledWith("/profile");
    });

    it("opens the create-room dialog", async () => {
      const click = await openMenu();
      await click(/^New Room/);

      expect(mocks.openCreateRoomDialog).toHaveBeenCalled();
    });

    it.each([
      [/^Light/, "light"],
      [/^Dark/, "dark"],
      [/^System/, "system"],
    ])("switches theme via %s", async (name, expected) => {
      const click = await openMenu();
      await click(name);

      expect(mocks.setTheme).toHaveBeenCalledWith(expected);
    });

    it("opens the keyboard shortcuts help", async () => {
      const click = await openMenu();
      await click(/^Keyboard shortcuts/);

      expect(mocks.showHelp).toHaveBeenCalled();
    });

    it("tells the user Support is not built yet", async () => {
      const click = await openMenu();
      await click("Support");

      expect(mocks.toastInfo).toHaveBeenCalledWith("Support page coming soon!");
    });

    it("signs out and returns home", async () => {
      mocks.signOut.mockResolvedValue(undefined);
      const click = await openMenu(true);
      await click(/^Log out/);

      await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
      expect(mocks.navigate).toHaveBeenCalledWith("/");
    });

    it("stays put when signing out fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.signOut.mockRejectedValue(new Error("network down"));

      const click = await openMenu(true);
      await click(/^Log out/);

      await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
      // Navigating away would imply a sign-out that never happened.
      expect(mocks.navigate).not.toHaveBeenCalled();
    });
  });

  describe("Command palette registration", () => {
    /** Render, then look up a registered command by its trigger key. */
    function registeredCommands() {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isAnonymous: true,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      const byKey = new Map<string, () => void>();
      for (const [command] of mocks.registerCommand.mock.calls) {
        byKey.set(command.key, command.action);
      }
      return byKey;
    }

    it("registers every documented shortcut", () => {
      const commands = registeredCommands();

      expect([...commands.keys()].sort()).toEqual(
        ["?", "b", "d", "h", "l", "p", "q", "r", "s", "t"].sort()
      );
    });

    it.each([
      ["h", "/"],
      ["p", "/profile"],
    ])("⌘K %s navigates to %s", (key, path) => {
      registeredCommands().get(key)!();

      expect(mocks.navigate).toHaveBeenCalledWith(path);
    });

    it.each([
      ["l", "light"],
      ["d", "dark"],
      ["t", "system"],
    ])("⌘K %s switches theme to %s", (key, expected) => {
      registeredCommands().get(key)!();

      expect(mocks.setTheme).toHaveBeenCalledWith(expected);
    });

    it("⌘K r opens the create-room dialog", () => {
      registeredCommands().get("r")!();

      expect(mocks.openCreateRoomDialog).toHaveBeenCalled();
    });

    it("⌘K ? opens the shortcuts help", () => {
      registeredCommands().get("?")!();

      expect(mocks.showHelp).toHaveBeenCalled();
    });

    it.each(["b", "s"])("⌘K %s reports an unbuilt page", (key) => {
      registeredCommands().get(key)!();

      expect(mocks.toastInfo).toHaveBeenCalledWith(
        expect.stringContaining("coming soon")
      );
    });

    it("unregisters its commands on unmount", () => {
      const cleanup = vi.fn();
      mocks.registerCommand.mockReturnValue(cleanup);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isAnonymous: true,
        isLoading: false,
      });

      const { unmount } = render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );
      unmount();

      // Ten commands registered, ten torn down — otherwise a remount would
      // stack duplicate handlers.
      expect(cleanup).toHaveBeenCalledTimes(10);
    });
  });

  describe("Keyboard toggle", () => {
    it("opens on Ctrl+/", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isAnonymous: true,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      expect(screen.queryByRole("menuitem", { name: "Sign In" })).toBeNull();

      await userEvent.keyboard("{Control>}/{/Control}");

      expect(
        await screen.findByRole("menuitem", { name: "Sign In" })
      ).toBeInTheDocument();
    });
  });

});

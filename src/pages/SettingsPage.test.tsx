import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsPage } from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  isAuthenticated: false,
}));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mocks.isAuthenticated = false;
  });

  it("pre-fills and saves the default name", async () => {
    localStorage.setItem("participant_name", "Ada");
    renderPage();

    const input = screen.getByLabelText("Default name");
    expect(input).toHaveValue("Ada");

    await userEvent.clear(input);
    await userEvent.type(input, "  Grace  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(localStorage.getItem("participant_name")).toBe("Grace");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Default name saved");
  });

  it("rejects an empty name", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Participant name is required")).toBeInTheDocument();
    expect(localStorage.getItem("participant_name")).toBeNull();
  });

  it("points signed-in users to the Account page instead", () => {
    mocks.isAuthenticated = true;
    renderPage();

    expect(screen.queryByLabelText("Default name")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Change it on the Account page" })
    ).toHaveAttribute("href", "/profile");
  });
});

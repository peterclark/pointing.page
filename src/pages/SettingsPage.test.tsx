import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("pre-fills and saves the default name", async () => {
    localStorage.setItem("participant_name", "Ada");
    render(<SettingsPage />);

    const input = screen.getByLabelText("Default name");
    expect(input).toHaveValue("Ada");

    await userEvent.clear(input);
    await userEvent.type(input, "  Grace  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(localStorage.getItem("participant_name")).toBe("Grace");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Default name saved");
  });

  it("rejects an empty name", async () => {
    render(<SettingsPage />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Participant name is required")).toBeInTheDocument();
    expect(localStorage.getItem("participant_name")).toBeNull();
  });
});

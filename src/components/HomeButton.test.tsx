/**
 * Tests for the fixed home button.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomeButton from "./HomeButton";

const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomeButton", () => {
  it("navigates to the landing page when clicked", async () => {
    render(
      <MemoryRouter>
        <HomeButton />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button"));

    expect(navigate).toHaveBeenCalledWith("/");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("names who built the app", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByText("Peter Clark")).toBeInTheDocument();
  });

  it("links to the résumé and the source in new tabs", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    const resume = screen.getByRole("link", { name: /View my résumé/ });
    expect(resume).toHaveAttribute("href", "https://peterclark.us");
    expect(resume).toHaveAttribute("target", "_blank");

    expect(
      screen.getByRole("link", { name: "Source code on GitHub" })
    ).toHaveAttribute("href", "https://github.com/peterclark/pointing.page");
  });
});

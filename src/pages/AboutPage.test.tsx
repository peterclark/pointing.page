import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("credits the builder with a link to their website in a new tab", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();

    const author = screen.getByRole("link", { name: "Peter Clark" });
    expect(author).toHaveAttribute("href", "https://peterclark.us");
    expect(author).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/Built by/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Source code on GitHub" })
    ).not.toBeInTheDocument();
  });
});

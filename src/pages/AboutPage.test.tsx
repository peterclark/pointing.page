import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("links the builder's name to their website and the source, in new tabs", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();

    const author = screen.getByRole("link", { name: "Peter Clark" });
    expect(author).toHaveAttribute("href", "https://peterclark.us");
    expect(author).toHaveAttribute("target", "_blank");

    expect(
      screen.getByRole("link", { name: "Source code on GitHub" })
    ).toHaveAttribute("href", "https://github.com/peterclark/pointing.page");
  });
});

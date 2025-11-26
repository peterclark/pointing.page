import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders with 'Creating your room...' message when isCreating is true", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={true}
      />
    );

    expect(screen.getByText("Creating your room...")).toBeInTheDocument();
  });

  it("renders with 'Joining your room...' message when isCreating is false", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={false}
        onComplete={onComplete}
        isLoading={true}
      />
    );

    expect(screen.getByText("Joining your room...")).toBeInTheDocument();
  });

  it("displays percentage starting at 0%", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={true}
      />
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("progresses to 100% over 2.5 seconds", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={true}
      />
    );

    // Initial state
    expect(screen.getByText("0%")).toBeInTheDocument();

    // Advance 1.25 seconds (halfway to 50%)
    act(() => {
      vi.advanceTimersByTime(1250);
    });
    expect(screen.getByText("50%")).toBeInTheDocument();

    // Advance to completion (total 2.5 seconds)
    act(() => {
      vi.advanceTimersByTime(1250);
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onComplete after pulse animation completes (1 second after 100%)", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={true}
        dbOperationComplete={true}
      />
    );

    // Progress to 100% (2.5 seconds)
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // onComplete should not be called yet
    expect(onComplete).not.toHaveBeenCalled();

    // Advance 1 more second for pulse animation
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("stops animation and displays error when error prop is provided", () => {
    const onComplete = vi.fn();
    render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={true}
        error="Failed to create room"
      />
    );

    expect(screen.getByText("Failed to create room")).toBeInTheDocument();
  });

  it("renders nothing when isLoading is false", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <LoadingScreen
        isCreating={true}
        onComplete={onComplete}
        isLoading={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

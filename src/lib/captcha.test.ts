/**
 * Tests for the Turnstile token helper used by anonymous sign-in.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCaptchaToken } from "./captcha";

type RenderOptions = {
  callback: (token: string) => void;
  "error-callback": () => void;
};

function stubTurnstile(behave: (options: RenderOptions) => void) {
  const remove = vi.fn();
  window.turnstile = {
    render: vi.fn((_el, options: RenderOptions) => {
      behave(options);
      return "widget-1";
    }),
    remove,
  };
  return { remove };
}

beforeEach(() => {
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.turnstile;
  document.body.innerHTML = "";
});

describe("getCaptchaToken", () => {
  it("returns undefined without a site key, so sign-in proceeds unchanged", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");

    await expect(getCaptchaToken()).resolves.toBeUndefined();
  });

  it("resolves with the token Turnstile issues and cleans up the widget", async () => {
    const { remove } = stubTurnstile((o) => o.callback("token-123"));

    await expect(getCaptchaToken()).resolves.toBe("token-123");

    expect(window.turnstile?.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: "site-key" })
    );
    expect(remove).toHaveBeenCalledWith("widget-1");
    expect(document.body.children).toHaveLength(0);
  });

  it("rejects when the challenge fails", async () => {
    stubTurnstile((o) => o["error-callback"]());

    await expect(getCaptchaToken()).rejects.toThrow(/challenge failed/);
    expect(document.body.children).toHaveLength(0);
  });

  it("rejects if Turnstile never answers", async () => {
    vi.useFakeTimers();
    stubTurnstile(() => {});

    const pending = getCaptchaToken();
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;

    vi.useRealTimers();
  });

  it("loads the Turnstile script when it is not on the page yet", async () => {
    const appended = vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      stubTurnstile((o) => o.callback("loaded-token"));
      (node as HTMLScriptElement).onload?.(new Event("load"));
      return node;
    });

    await expect(getCaptchaToken()).resolves.toBe("loaded-token");
    expect((appended.mock.calls[0][0] as HTMLScriptElement).src).toContain(
      "challenges.cloudflare.com/turnstile"
    );

    appended.mockRestore();
  });
});

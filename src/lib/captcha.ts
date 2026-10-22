/**
 * Cloudflare Turnstile token for Supabase's CAPTCHA protection.
 *
 * Every visitor signs in anonymously, so without a CAPTCHA a script can mint
 * auth users as fast as the per-IP rate limit allows. When CAPTCHA protection is
 * enabled in Supabase (Authentication > Attack Protection), every anonymous
 * sign-in must carry a token, and this produces one.
 *
 * Opt-in: with no `VITE_TURNSTILE_SITE_KEY` it returns `undefined` and sign-in
 * proceeds without a token, which is what Supabase expects while CAPTCHA
 * protection is off. Turn the two on together.
 */

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TIMEOUT_MS = 15_000;

interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      appearance?: "always" | "execute" | "interaction-only";
    }
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  scriptPromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile loaded without its API"));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Turnstile"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Get a single-use Turnstile token, or `undefined` when no site key is set.
 *
 * The widget only shows itself if Cloudflare wants an interaction; for most
 * visitors it resolves invisibly.
 */
export async function getCaptchaToken(): Promise<string | undefined> {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!siteKey) return undefined;

  const turnstile = await loadTurnstile();
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:50";
  document.body.appendChild(container);

  let widgetId: string | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Turnstile timed out")),
        TIMEOUT_MS
      );
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (token) => {
          clearTimeout(timer);
          resolve(token);
        },
        "error-callback": () => {
          clearTimeout(timer);
          reject(new Error("Turnstile challenge failed"));
        },
      });
    });
  } finally {
    if (widgetId) turnstile.remove(widgetId);
    container.remove();
  }
}

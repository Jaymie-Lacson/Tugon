const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const ENABLE_BEARER_AUTH = viteEnv?.VITE_ENABLE_BEARER_AUTH === "1";

const CSRF_COOKIE_NAME = viteEnv?.VITE_CSRF_COOKIE_NAME ?? "tugon.csrf";
const CSRF_HEADER_NAME = (viteEnv?.VITE_CSRF_HEADER_NAME ?? "x-csrf-token").toLowerCase();

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function shouldAttachCsrf(method: string | undefined) {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

export function withSecurityHeaders(
  headers: HeadersInit,
  options?: {
    method?: string;
    token?: string;
  },
): HeadersInit {
  const next = new Headers(headers);

  if (ENABLE_BEARER_AUTH && options?.token) {
    next.set("Authorization", `Bearer ${options.token}`);
  }

  if (shouldAttachCsrf(options?.method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      next.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  return next;
}

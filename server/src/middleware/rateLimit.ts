import type { Request, RequestHandler } from "express";

type IpRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
};

type WindowCounter = {
  windowStartMs: number;
  count: number;
};

const MAX_TRACKED_IPS = 20_000;
const PRUNE_COOLDOWN_MS = 5_000;

function pruneCounters(counters: Map<string, WindowCounter>, nowMs: number, windowMs: number) {
  for (const [ip, counter] of counters.entries()) {
    if (nowMs - counter.windowStartMs >= windowMs) {
      counters.delete(ip);
    }
  }

  if (counters.size <= MAX_TRACKED_IPS) {
    return;
  }

  const entriesToTrim = counters.size - MAX_TRACKED_IPS;
  let trimmed = 0;

  // Map preserves insertion order, so this drops oldest tracked counters first.
  for (const ip of counters.keys()) {
    counters.delete(ip);
    trimmed += 1;
    if (trimmed >= entriesToTrim) {
      break;
    }
  }
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].trim();
  }

  return request.ip || "unknown";
}

export function createIpRateLimiter(options: IpRateLimiterOptions): RequestHandler {
  const counters = new Map<string, WindowCounter>();
  let lastPruneAtMs = 0;

  return (req, res, next) => {
    const nowMs = Date.now();
    if (nowMs - lastPruneAtMs >= PRUNE_COOLDOWN_MS || counters.size > MAX_TRACKED_IPS) {
      pruneCounters(counters, nowMs, options.windowMs);
      lastPruneAtMs = nowMs;
    }

    const clientIp = getClientIp(req);
    const existing = counters.get(clientIp);

    if (!existing || nowMs - existing.windowStartMs >= options.windowMs) {
      counters.set(clientIp, {
        windowStartMs: nowMs,
        count: 1,
      });
      return next();
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((options.windowMs - (nowMs - existing.windowStartMs)) / 1000),
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message: options.message });
    }

    existing.count += 1;
    counters.set(clientIp, existing);
    return next();
  };
}

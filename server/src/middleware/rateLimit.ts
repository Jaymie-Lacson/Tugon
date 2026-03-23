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

  return (req, res, next) => {
    const nowMs = Date.now();
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

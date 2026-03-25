import { Prisma } from "@prisma/client";
import type { Request, RequestHandler } from "express";
import { prisma } from "../config/prisma.js";

type IpRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
  keyPrefix?: string;
};

type WindowCounter = {
  windowStartMs: number;
  count: number;
};

const MAX_TRACKED_IPS = 20_000;
const PRUNE_COOLDOWN_MS = 5_000;
let dbRateLimiterUnavailable = false;
let lastDbPruneMs = 0;
let sharedDbHitCount = 0;
let memoryFallbackHitCount = 0;
let sharedDbErrorCount = 0;
let lastSharedDbErrorAtIso: string | null = null;

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

function hasDatabaseUrlConfigured() {
  return Boolean((process.env.DATABASE_URL || "").trim());
}

function shouldAttemptDbRateLimiter() {
  if ((process.env.NODE_ENV ?? "development") === "test") {
    return false;
  }

  return hasDatabaseUrlConfigured() && !dbRateLimiterUnavailable;
}

function shouldPruneDbBuckets(nowMs: number, windowMs: number) {
  const pruneIntervalMs = Math.max(windowMs, 60_000);
  if (nowMs - lastDbPruneMs < pruneIntervalMs) {
    return false;
  }

  lastDbPruneMs = nowMs;
  return true;
}

function isMissingRateLimitTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  const message = String(error.meta?.message ?? "");
  return message.includes("IpRateLimitBucket");
}

async function incrementDbCounter(
  bucketKey: string,
  nowMs: number,
  options: IpRateLimiterOptions,
): Promise<WindowCounter | null> {
  if (!shouldAttemptDbRateLimiter()) {
    return null;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; windowStartMs: bigint | number }>>(
      Prisma.sql`
        INSERT INTO "IpRateLimitBucket" (
          "bucketKey",
          "windowStartMs",
          "count",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${bucketKey},
          ${BigInt(nowMs)},
          1,
          ${new Date(nowMs)},
          ${new Date(nowMs)}
        )
        ON CONFLICT ("bucketKey") DO UPDATE SET
          "windowStartMs" = CASE
            WHEN ${BigInt(nowMs)} - "IpRateLimitBucket"."windowStartMs" >= ${BigInt(options.windowMs)}
              THEN ${BigInt(nowMs)}
            ELSE "IpRateLimitBucket"."windowStartMs"
          END,
          "count" = CASE
            WHEN ${BigInt(nowMs)} - "IpRateLimitBucket"."windowStartMs" >= ${BigInt(options.windowMs)}
              THEN 1
            ELSE "IpRateLimitBucket"."count" + 1
          END,
          "updatedAt" = ${new Date(nowMs)}
        RETURNING "count", "windowStartMs"
      `,
    );

    if (shouldPruneDbBuckets(nowMs, options.windowMs)) {
      const staleThresholdMs = nowMs - options.windowMs * 5;
      void prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM "IpRateLimitBucket"
          WHERE "windowStartMs" < ${BigInt(staleThresholdMs)}
        `,
      );
    }

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      count: Number(row.count),
      windowStartMs: Number(row.windowStartMs),
    };
  } catch (error) {
    sharedDbErrorCount += 1;
    lastSharedDbErrorAtIso = new Date().toISOString();

    if (isMissingRateLimitTableError(error) || error instanceof Prisma.PrismaClientInitializationError) {
      dbRateLimiterUnavailable = true;
      return null;
    }

    console.warn("[RATE_LIMIT] Shared rate limiter query failed, using in-memory fallback.", error);
    return null;
  }
}

export function createIpRateLimiter(options: IpRateLimiterOptions): RequestHandler {
  const counters = new Map<string, WindowCounter>();
  let lastPruneAtMs = 0;
  const keyPrefix = (options.keyPrefix || "api").trim() || "api";

  return async (req, res, next) => {
    const nowMs = Date.now();
    if (nowMs - lastPruneAtMs >= PRUNE_COOLDOWN_MS || counters.size > MAX_TRACKED_IPS) {
      pruneCounters(counters, nowMs, options.windowMs);
      lastPruneAtMs = nowMs;
    }

    const clientIp = getClientIp(req);
    const bucketKey = `${keyPrefix}:${clientIp}`;

    const sharedCounter = await incrementDbCounter(bucketKey, nowMs, options);
    if (sharedCounter) {
      sharedDbHitCount += 1;

      if (sharedCounter.count > options.maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((options.windowMs - (nowMs - sharedCounter.windowStartMs)) / 1000),
        );

        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({ message: options.message });
      }

      return next();
    }

    memoryFallbackHitCount += 1;

    pruneCounters(counters, nowMs, options.windowMs);
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

export function getIpRateLimiterDiagnostics() {
  return {
    databaseConfigured: hasDatabaseUrlConfigured(),
    sharedRateLimiterAvailable: !dbRateLimiterUnavailable,
    sharedDbHitCount,
    memoryFallbackHitCount,
    sharedDbErrorCount,
    lastSharedDbErrorAtIso,
  };
}

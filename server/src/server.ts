import type { Server } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const app = createApp();
const shutdownGraceMs = 10_000;
let isShuttingDown = false;

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function shutdown(server: Server, reason: string, exitCode: number) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`[SERVER] Starting graceful shutdown (${reason}).`);

  const forcedExitTimer = setTimeout(() => {
    console.error("[SERVER] Graceful shutdown timed out; forcing process exit.");
    process.exit(exitCode);
  }, shutdownGraceMs);

  try {
    await closeServer(server);
    await prisma.$disconnect();
    clearTimeout(forcedExitTimer);
    console.log("[SERVER] Shutdown completed.");
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forcedExitTimer);
    console.error("[SERVER] Shutdown failed:", error);
    process.exit(1);
  }
}

const server = app.listen(env.port, () => {
  // Startup log for local development and deployment diagnostics.
  console.log(`TUGON server listening on port ${env.port} (${env.nodeEnv})`);
});

process.on("SIGINT", () => {
  void shutdown(server, "SIGINT", 0);
});

process.on("SIGTERM", () => {
  void shutdown(server, "SIGTERM", 0);
});

process.on("uncaughtException", (error) => {
  console.error("[SERVER] Uncaught exception:", error);
  void shutdown(server, "uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[SERVER] Unhandled promise rejection:", reason);
  void shutdown(server, "unhandledRejection", 1);
});

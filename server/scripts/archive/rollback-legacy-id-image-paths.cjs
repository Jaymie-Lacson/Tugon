#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    execute: false,
    logFile: null,
    limit: null,
  };

  for (const arg of args) {
    if (arg === "--execute") {
      options.execute = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.execute = false;
      continue;
    }

    if (arg.startsWith("--file=")) {
      const filePath = arg.slice("--file=".length).trim();
      if (!filePath) {
        throw new Error("--file cannot be empty.");
      }
      options.logFile = path.resolve(filePath);
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive number.");
      }
      options.limit = Math.floor(parsed);
      continue;
    }

    if (arg === "--help") {
      printHelpAndExit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.logFile) {
    throw new Error("--file is required and must point to a migration jsonl log.");
  }

  return options;
}

function printHelpAndExit(code) {
  console.log(`Usage: node scripts/rollback-legacy-id-image-paths.cjs --file=<jsonl> [options]

Options:
  --dry-run            Analyze and print what would be restored (default)
  --execute            Perform DB rollback updates
  --limit=<n>          Limit number of rollback records
  --help               Show this help
`);
  process.exit(code);
}

function parseLogFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Log file not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const entries = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      entries.push(parsed);
    } catch {
      // Ignore malformed lines and continue.
    }
  }

  return entries;
}

async function main() {
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(`[rollback-legacy-id-image-paths] ${error.message}`);
    printHelpAndExit(1);
  }

  const dryRun = !options.execute;
  console.log(`[rollback-legacy-id-image-paths] Mode: ${dryRun ? "dry-run" : "execute"}`);
  console.log(`[rollback-legacy-id-image-paths] Source: ${options.logFile}`);

  const entries = parseLogFile(options.logFile)
    .filter((entry) => entry && entry.status === "success" && entry.userId && typeof entry.oldValue === "string")
    .map((entry) => ({
      userId: entry.userId,
      oldValue: entry.oldValue,
      newValue: typeof entry.newValue === "string" ? entry.newValue : null,
      timestamp: entry.timestamp || null,
    }));

  const rollbackTargets = options.limit ? entries.slice(0, options.limit) : entries;

  let restored = 0;
  let failed = 0;

  for (const target of rollbackTargets) {
    if (dryRun) {
      console.log(`[dry-run] would restore user ${target.userId}`);
      continue;
    }

    try {
      await prisma.user.update({
        where: { id: target.userId },
        data: { idImageUrl: target.oldValue },
      });
      restored += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[rollback-legacy-id-image-paths] failed for ${target.userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n[rollback-legacy-id-image-paths] Summary");
  console.log(`  matched_success_entries: ${entries.length}`);
  console.log(`  processed: ${rollbackTargets.length}`);
  console.log(`  restored: ${restored}`);
  console.log(`  failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(`[rollback-legacy-id-image-paths] Fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

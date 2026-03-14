#!/usr/bin/env node

/*
  Railway preflight check:
  - validates required environment variables
  - validates Prisma schema
  - generates Prisma client
  - optionally checks migration status when RUN_DB_MIGRATIONS=1
*/

const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    console.error(`[preflight] Missing required env var: ${name}`);
    process.exit(1);
  }
}

console.log("[preflight] Validating required environment variables...");
assertEnv("JWT_SECRET");
assertEnv("DATABASE_URL");

if (process.env.RUN_DB_MIGRATIONS === "1") {
  assertEnv("DIRECT_URL");
}

console.log("[preflight] Running prisma validate...");
run("npm", ["run", "prisma:validate"]);

console.log("[preflight] Running prisma generate...");
run("npm", ["run", "prisma:generate"]);

if (process.env.RUN_DB_MIGRATIONS === "1") {
  console.log("[preflight] Checking migration status using DIRECT_URL...");
  const env = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };
  run("npm", ["run", "prisma:status"], { env });
} else {
  console.log("[preflight] RUN_DB_MIGRATIONS!=1, skipping migration status check.");
}

console.log("[preflight] Railway deployment preflight passed.");

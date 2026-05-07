#!/usr/bin/env node

/*
  Ensures production migrations run against direct Postgres when available.
  This avoids pooled/session-mode limits (e.g., Supavisor max clients reached).
*/

const { spawnSync } = require("node:child_process");

const env = { ...process.env };
if (env.DIRECT_URL && env.DIRECT_URL.trim().length > 0) {
  env.DATABASE_URL = env.DIRECT_URL;
  console.log("[prisma:migrate:deploy] Using DIRECT_URL for migration connection.");
} else {
  const usingSupabasePooler = /pooler\.supabase\.com/i.test(env.DATABASE_URL || "");
  if (env.RUN_DB_MIGRATIONS === "1" && usingSupabasePooler) {
    console.error(
      "[prisma:migrate:deploy] DIRECT_URL is required for Supabase pooled DATABASE_URL when RUN_DB_MIGRATIONS=1.",
    );
    process.exit(1);
  }
  console.log("[prisma:migrate:deploy] DIRECT_URL not set; using DATABASE_URL.");
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

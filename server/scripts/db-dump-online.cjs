#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function loadEnv() {
  // Load server/.env first, then allow root .env to provide missing values.
  const candidates = [path.join(projectRoot, ".env"), path.join(projectRoot, "..", ".env")];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function runOrExit(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

function parseSourceUrl() {
  const rawUrl = process.env.ONLINE_DATABASE_URL || process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("[db:dump:online] Missing ONLINE_DATABASE_URL (or DATABASE_URL fallback). Aborting.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    console.error("[db:dump:online] Invalid database URL format.");
    process.exit(1);
  }

  if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
    console.error("[db:dump:online] Only PostgreSQL URLs are supported.");
    process.exit(1);
  }

  // Prisma pooler flags are valid for Prisma but not for pg_dump/libpq URI parsing.
  const removedParams = [];
  for (const key of ["pgbouncer", "connection_limit"]) {
    if (parsed.searchParams.has(key)) {
      parsed.searchParams.delete(key);
      removedParams.push(key);
    }
  }

  if (removedParams.length > 0) {
    console.log(`[db:dump:online] Removed unsupported URI params for pg_dump: ${removedParams.join(", ")}`);
  }

  return { url: parsed.toString(), parsed };
}

function buildDumpPath(parsed) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const dbName = (parsed.pathname || "").replace(/^\//, "") || "postgres";
  const safeDbName = dbName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const outDir = process.env.DB_BACKUP_DIR || path.join(projectRoot, "backups");

  fs.mkdirSync(outDir, { recursive: true });
  return path.join(outDir, `${safeDbName}-${stamp}.dump`);
}

function main() {
  loadEnv();

  if (!commandExists("pg_dump")) {
    console.error("[db:dump:online] pg_dump is not installed or not in PATH.");
    console.error("[db:dump:online] Install PostgreSQL client tools, then run again.");
    process.exit(1);
  }

  const { url, parsed } = parseSourceUrl();
  const outFile = process.env.DB_DUMP_FILE || buildDumpPath(parsed);

  console.log(`[db:dump:online] Source host: ${parsed.hostname}`);
  console.log(`[db:dump:online] Source database: ${(parsed.pathname || "").replace(/^\//, "") || "postgres"}`);
  console.log(`[db:dump:online] Writing: ${outFile}`);

  const args = [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--verbose",
    `--file=${outFile}`,
    url,
  ];

  runOrExit("pg_dump", args);

  const resolved = path.resolve(outFile);
  fs.writeFileSync(path.join(projectRoot, "backups", "latest-dump-path.txt"), `${resolved}\n`, "utf8");

  console.log("[db:dump:online] Dump completed successfully.");
  console.log(`[db:dump:online] Saved path marker: ${path.join(projectRoot, "backups", "latest-dump-path.txt")}`);
}

main();

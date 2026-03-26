#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function loadEnv() {
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

function parseTargetUrl() {
  const target = process.env.LOCAL_DATABASE_URL;
  if (!target) {
    console.error("[db:restore:local] Missing LOCAL_DATABASE_URL in environment.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    console.error("[db:restore:local] LOCAL_DATABASE_URL has invalid format.");
    process.exit(1);
  }

  if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
    console.error("[db:restore:local] Only PostgreSQL URLs are supported.");
    process.exit(1);
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
  if (!isLocalHost && process.env.ALLOW_NON_LOCAL_RESTORE !== "1") {
    console.error("[db:restore:local] Refusing to restore to non-local host.");
    console.error("[db:restore:local] Set ALLOW_NON_LOCAL_RESTORE=1 only if you intentionally want this.");
    process.exit(1);
  }

  return { target, parsed };
}

function parseDumpPath() {
  const cliArg = process.argv.find((arg) => arg.startsWith("--file="));
  const dumpFromArg = cliArg ? cliArg.slice("--file=".length) : "";
  const envDump = process.env.DB_DUMP_FILE || "";

  let selected = dumpFromArg || envDump;

  if (!selected) {
    const markerPath = path.join(projectRoot, "backups", "latest-dump-path.txt");
    if (fs.existsSync(markerPath)) {
      selected = fs.readFileSync(markerPath, "utf8").trim();
    }
  }

  if (!selected) {
    console.error("[db:restore:local] Missing dump file path.");
    console.error("[db:restore:local] Provide --file=<path> or set DB_DUMP_FILE.");
    process.exit(1);
  }

  const resolved = path.resolve(selected);
  if (!fs.existsSync(resolved)) {
    console.error(`[db:restore:local] Dump file not found: ${resolved}`);
    process.exit(1);
  }

  return resolved;
}

function main() {
  loadEnv();

  if (!commandExists("pg_restore")) {
    console.error("[db:restore:local] pg_restore not found in PATH.");
    console.error("[db:restore:local] Install PostgreSQL client tools, then run again.");
    process.exit(1);
  }

  const dumpFile = parseDumpPath();
  const { target, parsed } = parseTargetUrl();
  const includeAllSchemas = process.env.DB_RESTORE_INCLUDE_ALL_SCHEMAS === "1";
  const restoreSchema = process.env.DB_RESTORE_SCHEMA || "public";

  console.log(`[db:restore:local] Target host: ${parsed.hostname}`);
  console.log(`[db:restore:local] Target database: ${(parsed.pathname || "").replace(/^\//, "") || "postgres"}`);
  console.log(`[db:restore:local] Source dump: ${dumpFile}`);
  if (includeAllSchemas) {
    console.log("[db:restore:local] Restoring all schemas (DB_RESTORE_INCLUDE_ALL_SCHEMAS=1).");
  } else {
    console.log(`[db:restore:local] Restoring schema: ${restoreSchema}`);
  }

  const args = [
    "--verbose",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    `--dbname=${target}`,
  ];

  if (!includeAllSchemas) {
    args.push(`--schema=${restoreSchema}`);
  }

  args.push(dumpFile);

  runOrExit("pg_restore", args);

  console.log("[db:restore:local] Restore completed successfully.");
}

main();

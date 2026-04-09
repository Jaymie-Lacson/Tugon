#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ImageKit = require("@imagekit/nodejs");
const { PrismaClient } = require("@prisma/client");

const projectRoot = path.resolve(__dirname, "..");
const prisma = new PrismaClient();

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

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    execute: false,
    limit: null,
    userId: null,
    logFile: null,
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

    if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--limit must be a positive number.");
      }
      options.limit = Math.floor(parsed);
      continue;
    }

    if (arg.startsWith("--user-id=")) {
      const userId = arg.slice("--user-id=".length).trim();
      if (!userId) {
        throw new Error("--user-id cannot be empty.");
      }
      options.userId = userId;
      continue;
    }

    if (arg.startsWith("--log-file=")) {
      const logFile = arg.slice("--log-file=".length).trim();
      if (!logFile) {
        throw new Error("--log-file cannot be empty.");
      }
      options.logFile = path.resolve(logFile);
      continue;
    }

    if (arg === "--help") {
      printHelpAndExit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelpAndExit(code) {
  console.log(`Usage: node scripts/migrate-legacy-id-image-paths.cjs [options]

Options:
  --dry-run            Analyze and report only (default)
  --execute            Perform migration writes to DB and ImageKit uploads
  --limit=<n>          Limit number of users processed
  --user-id=<id>       Process a single user id
  --log-file=<path>    Override jsonl log file path
  --help               Show this help
`);
  process.exit(code);
}

function normalizeFolder(folder, fallback) {
  const raw = (folder || fallback).trim();
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function hasImageKitConfig() {
  return Boolean(
    process.env.IMAGEKIT_PRIVATE_KEY
    && process.env.IMAGEKIT_PUBLIC_KEY
    && process.env.IMAGEKIT_URL_ENDPOINT,
  );
}

function hasSupabaseFetchConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function classifyIdImageUrl(value) {
  if (!value) {
    return "skip-empty";
  }

  if (value.startsWith("data:image/")) {
    return "skip-inline-data-url";
  }

  if (/^https?:\/\/ik\.imagekit\.io\//i.test(value)) {
    return "skip-already-imagekit-url";
  }

  if (/^https?:\/\//i.test(value)) {
    if (/supabase\.co\/storage\/v1\/object\//i.test(value)) {
      return "supabase-public-url";
    }

    return "skip-other-url";
  }

  return "supabase-path";
}

function safeBaseName(value) {
  const base = path.basename(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base || "legacy-id.bin";
}

function appendJsonl(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function encodedPath(value) {
  return String(value)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchAsBuffer(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return { ok: false, status: response.status, statusText: response.statusText, buffer: null, mimeType: null };
  }

  const mimeType = response.headers.get("content-type") || null;
  const arrayBuffer = await response.arrayBuffer();
  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

async function fetchSupabasePublicUrl(url) {
  const result = await fetchAsBuffer(url, {});
  if (!result.ok) {
    throw new Error(`Unable to fetch Supabase URL (${result.status} ${result.statusText}).`);
  }

  if (!result.buffer || result.buffer.length === 0) {
    throw new Error("Downloaded file is empty.");
  }

  return { buffer: result.buffer, mimeType: result.mimeType };
}

async function fetchSupabasePath(objectPath, bucketName, supabaseUrl, serviceKey) {
  const encodedObjectPath = encodedPath(objectPath);
  const base = supabaseUrl.replace(/\/+$/, "");
  const encodedBucket = encodeURIComponent(bucketName);
  const candidates = [
    `${base}/storage/v1/object/authenticated/${encodedBucket}/${encodedObjectPath}`,
    `${base}/storage/v1/object/${encodedBucket}/${encodedObjectPath}`,
  ];

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  let lastError = null;
  for (const url of candidates) {
    const result = await fetchAsBuffer(url, headers);
    if (result.ok) {
      if (!result.buffer || result.buffer.length === 0) {
        throw new Error("Downloaded file is empty.");
      }
      return { buffer: result.buffer, mimeType: result.mimeType };
    }

    lastError = `${result.status} ${result.statusText}`;
  }

  throw new Error(`Unable to fetch Supabase object path (${lastError || "unknown"}).`);
}

function extensionFromMime(mimeType) {
  if (!mimeType) {
    return "";
  }

  const mapping = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return mapping[normalized] || "";
}

function withExtension(fileName, extension) {
  if (!extension) {
    return fileName;
  }

  if (/\.[a-zA-Z0-9]+$/.test(fileName)) {
    return fileName;
  }

  return `${fileName}.${extension}`;
}

function createLogPath(overridePath) {
  if (overridePath) {
    return overridePath;
  }

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

  return path.join(projectRoot, "backups", "migrations", `legacy-id-image-migration-${stamp}.jsonl`);
}

async function getCandidates(options) {
  const where = {
    idImageUrl: {
      not: null,
    },
  };

  if (options.userId) {
    where.id = options.userId;
  }

  const candidates = await prisma.user.findMany({
    where,
    select: {
      id: true,
      phoneNumber: true,
      idImageUrl: true,
      verificationStatus: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    ...(options.limit ? { take: options.limit } : {}),
  });

  return candidates;
}

function printSummary(summary) {
  console.log("\n[migrate-legacy-id-image-paths] Summary");
  console.log(`  total_scanned: ${summary.total}`);
  console.log(`  legacy_candidates: ${summary.legacyCandidates}`);
  for (const [key, value] of Object.entries(summary.classificationCounts)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log(`  migrated: ${summary.migrated}`);
  console.log(`  failed: ${summary.failed}`);
  console.log(`  skipped: ${summary.skipped}`);
}

async function main() {
  loadEnv();

  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(`[migrate-legacy-id-image-paths] ${error.message}`);
    printHelpAndExit(1);
  }

  const dryRun = !options.execute;
  const logPath = createLogPath(options.logFile);
  const bucketName = (process.env.SUPABASE_ID_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "resident-ids").trim();
  const idFolder = normalizeFolder(process.env.IMAGEKIT_ID_FOLDER, "/resident-ids");

  console.log(`[migrate-legacy-id-image-paths] Mode: ${dryRun ? "dry-run" : "execute"}`);
  console.log(`[migrate-legacy-id-image-paths] Log file: ${logPath}`);

  if (!dryRun && !hasImageKitConfig()) {
    throw new Error("ImageKit configuration missing. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT.");
  }

  if (!hasSupabaseFetchConfig()) {
    console.warn("[migrate-legacy-id-image-paths] Supabase fetch config is missing. Only dry classification will be possible.");
  }

  const imagekit = hasImageKitConfig()
    ? new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      })
    : null;

  const users = await getCandidates(options);

  const summary = {
    total: users.length,
    legacyCandidates: 0,
    classificationCounts: {
      "supabase-public-url": 0,
      "supabase-path": 0,
      "skip-inline-data-url": 0,
      "skip-already-imagekit-url": 0,
      "skip-other-url": 0,
      "skip-empty": 0,
    },
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  for (const user of users) {
    const source = user.idImageUrl || "";
    const classification = classifyIdImageUrl(source);
    summary.classificationCounts[classification] = (summary.classificationCounts[classification] || 0) + 1;

    const isLegacy = classification === "supabase-public-url" || classification === "supabase-path";
    if (!isLegacy) {
      summary.skipped += 1;
      appendJsonl(logPath, {
        status: "skipped",
        reason: classification,
        userId: user.id,
        phoneNumber: user.phoneNumber,
        oldValue: source,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    summary.legacyCandidates += 1;

    if (dryRun) {
      appendJsonl(logPath, {
        status: "dry-run-candidate",
        reason: classification,
        userId: user.id,
        phoneNumber: user.phoneNumber,
        oldValue: source,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      if (!imagekit) {
        throw new Error("ImageKit client unavailable.");
      }
      if (!hasSupabaseFetchConfig()) {
        throw new Error("Supabase fetch config missing for execute mode.");
      }

      let fetched;
      if (classification === "supabase-public-url") {
        fetched = await fetchSupabasePublicUrl(source);
      } else {
        fetched = await fetchSupabasePath(
          source,
          bucketName,
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
      }

      const extension = extensionFromMime(fetched.mimeType);
      const originalName = classification === "supabase-public-url"
        ? safeBaseName(new URL(source).pathname)
        : safeBaseName(source);
      const fileName = withExtension(originalName, extension);

      const upload = await imagekit.files.upload({
        file: await ImageKit.toFile(fetched.buffer, fileName),
        fileName,
        folder: `${idFolder}/${user.id}`,
        isPrivateFile: true,
        useUniqueFileName: true,
        overwriteFile: false,
        tags: ["tugon", "migration", "verification-id"],
      });

      if (!upload.filePath) {
        throw new Error("ImageKit upload did not return filePath.");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { idImageUrl: upload.filePath },
      });

      summary.migrated += 1;
      appendJsonl(logPath, {
        status: "success",
        reason: classification,
        userId: user.id,
        phoneNumber: user.phoneNumber,
        oldValue: source,
        newValue: upload.filePath,
        imagekitUrl: upload.url || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      summary.failed += 1;
      appendJsonl(logPath, {
        status: "failed",
        reason: classification,
        userId: user.id,
        phoneNumber: user.phoneNumber,
        oldValue: source,
        error: error instanceof Error ? error.message : "unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  printSummary(summary);
  console.log("[migrate-legacy-id-image-paths] Done.");
}

main()
  .catch((error) => {
    console.error(`[migrate-legacy-id-image-paths] Fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

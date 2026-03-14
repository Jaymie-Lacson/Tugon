import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export type PreparedEvidence = {
  kind: "photo" | "audio";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string | null;
  publicUrl: string | null;
  storageProvider: "supabase" | "none";
};

type EvidencePayload = {
  fileName?: string;
  mimeType?: string;
  dataUrl: string;
};

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid evidence data URL format.");
  }

  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new Error("Evidence file is empty.");
  }

  return { mimeType, bytes };
}

function sanitizeFileName(fileName: string | undefined, fallback: string): string {
  const candidate = (fileName ?? fallback).trim();
  const safe = candidate.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return safe.length > 0 ? safe : fallback;
}

function ensureAllowedMimeType(kind: "photo" | "audio", mimeType: string) {
  const photoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  const audioMimeTypes = new Set(["audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4"]);

  if (kind === "photo" && !photoMimeTypes.has(mimeType)) {
    throw new Error(`Unsupported photo mime type: ${mimeType}`);
  }

  if (kind === "audio" && !audioMimeTypes.has(mimeType)) {
    throw new Error(`Unsupported audio mime type: ${mimeType}`);
  }
}

function hasSupabaseStorageConfig(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey && env.supabaseStorageBucket);
}

async function uploadToSupabase(
  reportId: string,
  citizenUserId: string,
  payload: EvidencePayload,
  kind: "photo" | "audio",
  index: number,
): Promise<PreparedEvidence> {
  const { mimeType: parsedMimeType, bytes } = parseDataUrl(payload.dataUrl);
  const mimeType = payload.mimeType?.trim() || parsedMimeType;
  ensureAllowedMimeType(kind, mimeType);

  const extension = mimeType.split("/")[1] ?? "bin";
  const fileName = sanitizeFileName(payload.fileName, `${kind}-${index + 1}.${extension}`);
  const storagePath = `${reportId}/${kind}/${Date.now()}-${fileName}`;

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const upload = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(storagePath, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (upload.error) {
    throw new Error(`Failed to upload ${kind}: ${upload.error.message}`);
  }

  const { data } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(storagePath);

  return {
    kind,
    fileName,
    mimeType,
    sizeBytes: bytes.length,
    storagePath,
    publicUrl: data.publicUrl ?? null,
    storageProvider: "supabase",
  };
}

function prepareWithoutUpload(
  payload: EvidencePayload,
  kind: "photo" | "audio",
  index: number,
): PreparedEvidence {
  const { mimeType: parsedMimeType, bytes } = parseDataUrl(payload.dataUrl);
  const mimeType = payload.mimeType?.trim() || parsedMimeType;
  ensureAllowedMimeType(kind, mimeType);
  const extension = mimeType.split("/")[1] ?? "bin";
  const fileName = sanitizeFileName(payload.fileName, `${kind}-${index + 1}.${extension}`);

  return {
    kind,
    fileName,
    mimeType,
    sizeBytes: bytes.length,
    storagePath: null,
    publicUrl: null,
    storageProvider: "none",
  };
}

export const evidenceStorageService = {
  async uploadReportEvidence(input: {
    reportId: string;
    citizenUserId: string;
    photos: EvidencePayload[];
    audio: EvidencePayload | null;
  }): Promise<PreparedEvidence[]> {
    const items: Array<{ payload: EvidencePayload; kind: "photo" | "audio"; index: number }> = [];

    input.photos.forEach((payload, index) => {
      items.push({ payload, kind: "photo", index });
    });

    if (input.audio) {
      items.push({ payload: input.audio, kind: "audio", index: 0 });
    }

    if (items.length === 0) {
      return [];
    }

    const canUpload = hasSupabaseStorageConfig();
    if (!canUpload && env.requireEvidenceStorageUpload) {
      throw new Error("Evidence storage is required but Supabase storage environment variables are missing.");
    }

    if (!canUpload) {
      return items.map(({ payload, kind, index }) => prepareWithoutUpload(payload, kind, index));
    }

    const uploaded: PreparedEvidence[] = [];
    for (const item of items) {
      const result = await uploadToSupabase(
        input.reportId,
        input.citizenUserId,
        item.payload,
        item.kind,
        item.index,
      );
      uploaded.push(result);
    }

    return uploaded;
  },
};

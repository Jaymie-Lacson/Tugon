import sharp from "sharp";
import { env } from "../../config/env.js";
import { hasImageKitConfig, uploadBufferToImageKit } from "../storage/imagekit.service.js";

export type PreparedEvidence = {
  kind: "photo" | "audio";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string | null;
  publicUrl: string | null;
  storageProvider: "imagekit" | "none";
};

type EvidencePayload = {
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  bytes?: Buffer;
};

function startsWithBytes(bytes: Buffer, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }

  return prefix.every((value, index) => bytes[index] === value);
}

function hasMp4FamilySignature(bytes: Buffer): boolean {
  if (bytes.length < 12) {
    return false;
  }

  return bytes.toString("ascii", 4, 8) === "ftyp";
}

function normalizeEvidenceMimeType(kind: "photo" | "audio", mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();

  if (kind === "photo" && normalized === "image/jpg") {
    return "image/jpeg";
  }

  if (kind === "audio" && normalized === "audio/mp3") {
    return "audio/mpeg";
  }

  return normalized;
}

function ensureAllowedSignature(kind: "photo" | "audio", mimeType: string, bytes: Buffer) {
  if (kind === "photo") {
    if (mimeType === "image/jpeg" && !startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
      throw new Error("Photo content does not match declared mime type.");
    }

    if (mimeType === "image/png" && !startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47])) {
      throw new Error("Photo content does not match declared mime type.");
    }

    if (mimeType === "image/webp") {
      const isRiff = startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]);
      const isWebp = bytes.length >= 12 && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!isRiff || !isWebp) {
        throw new Error("Photo content does not match declared mime type.");
      }
    }

    if (mimeType === "image/heic" || mimeType === "image/heif") {
      const hasFtyp = bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp";
      if (!hasFtyp) {
        throw new Error("Photo content does not match declared mime type.");
      }
    }

    return;
  }

  if (mimeType === "audio/ogg" && !startsWithBytes(bytes, [0x4f, 0x67, 0x67, 0x53])) {
    throw new Error("Audio content does not match declared mime type.");
  }

  if (mimeType === "audio/webm" && !startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    throw new Error("Audio content does not match declared mime type.");
  }

  if (mimeType === "audio/wav") {
    const isRiff = startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]);
    const isWave = bytes.length >= 12 && bytes.toString("ascii", 8, 12) === "WAVE";
    if (!isRiff || !isWave) {
      throw new Error("Audio content does not match declared mime type.");
    }
  }

  if (mimeType === "audio/mpeg") {
    const hasId3 = startsWithBytes(bytes, [0x49, 0x44, 0x33]);
    const hasFrameSync = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    if (!hasId3 && !hasFrameSync) {
      throw new Error("Audio content does not match declared mime type.");
    }
  }

  if (mimeType === "audio/mp4" && !hasMp4FamilySignature(bytes)) {
    throw new Error("Audio content does not match declared mime type.");
  }
}

const PHOTO_MAX_DIMENSION = 1920;
const PHOTO_COMPRESS_QUALITY = 80;

async function compressPhoto(bytes: Buffer, mimeType: string): Promise<{ bytes: Buffer; mimeType: string }> {
  try {
    const outputMimeType = mimeType === "image/webp" ? "image/webp" : "image/jpeg";
    const pipeline = sharp(bytes).resize({
      width: PHOTO_MAX_DIMENSION,
      height: PHOTO_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

    const compressed =
      outputMimeType === "image/webp"
        ? await pipeline.webp({ quality: PHOTO_COMPRESS_QUALITY }).toBuffer()
        : await pipeline.jpeg({ quality: PHOTO_COMPRESS_QUALITY, mozjpeg: true }).toBuffer();

    return { bytes: compressed, mimeType: outputMimeType };
  } catch {
    return { bytes, mimeType };
  }
}

function ensureAllowedSize(kind: "photo" | "audio", bytes: Buffer) {
  const maxBytes = kind === "photo" ? env.evidenceMaxPhotoBytes : env.evidenceMaxAudioBytes;

  if (bytes.length > maxBytes) {
    const label = kind === "photo" ? "Photo" : "Audio";
    throw new Error(`${label} evidence exceeds maximum allowed size.`);
  }
}

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

function parseEvidencePayload(payload: EvidencePayload): { mimeType: string; bytes: Buffer } {
  if (Buffer.isBuffer(payload.bytes) && payload.bytes.length > 0) {
    const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.trim() : "";
    if (!mimeType) {
      throw new Error("Evidence mime type is required for binary uploads.");
    }

    return { mimeType, bytes: payload.bytes };
  }

  if (typeof payload.dataUrl === "string" && payload.dataUrl.length > 0) {
    return parseDataUrl(payload.dataUrl);
  }

  throw new Error("Evidence payload is required.");
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

function validateEvidencePayload(kind: "photo" | "audio", mimeType: string, bytes: Buffer) {
  ensureAllowedMimeType(kind, mimeType);
  ensureAllowedSize(kind, bytes);
  ensureAllowedSignature(kind, mimeType, bytes);
}

async function uploadToImageKit(
  reportId: string,
  _citizenUserId: string,
  payload: EvidencePayload,
  kind: "photo" | "audio",
  index: number,
): Promise<PreparedEvidence> {
  const { mimeType: parsedMimeType, bytes: rawBytes } = parseEvidencePayload(payload);
  const mimeType = normalizeEvidenceMimeType(kind, payload.mimeType?.trim() || parsedMimeType);
  validateEvidencePayload(kind, mimeType, rawBytes);

  const { bytes, mimeType: finalMimeType } =
    kind === "photo" ? await compressPhoto(rawBytes, mimeType) : { bytes: rawBytes, mimeType };

  const extension = finalMimeType.split("/")[1] ?? "bin";
  const fileName = sanitizeFileName(payload.fileName, `${kind}-${index + 1}.${extension}`);
  const prefixedFileName = `${Date.now()}-${fileName}`;
  const upload = await uploadBufferToImageKit({
    bytes,
    fileName: prefixedFileName,
    folder: `${env.imagekitEvidenceFolder}/${reportId}/${kind}`,
    tags: ["tugon", "incident-evidence", kind],
  });

  return {
    kind,
    fileName,
    mimeType: finalMimeType,
    sizeBytes: bytes.length,
    storagePath: upload.filePath,
    publicUrl: upload.url,
    storageProvider: "imagekit",
  };
}

function prepareWithoutUpload(
  payload: EvidencePayload,
  kind: "photo" | "audio",
  index: number,
): PreparedEvidence {
  const { mimeType: parsedMimeType, bytes } = parseEvidencePayload(payload);
  const mimeType = normalizeEvidenceMimeType(kind, payload.mimeType?.trim() || parsedMimeType);
  validateEvidencePayload(kind, mimeType, bytes);
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

    const canUpload = hasImageKitConfig();
    if (!canUpload && env.requireEvidenceStorageUpload) {
      throw new Error("Evidence storage is required but ImageKit environment variables are missing.");
    }

    if (!canUpload) {
      return items.map(({ payload, kind, index }) => prepareWithoutUpload(payload, kind, index));
    }

    const uploaded: PreparedEvidence[] = [];
    for (const item of items) {
      const result = await uploadToImageKit(
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

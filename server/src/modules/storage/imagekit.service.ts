import ImageKit from "@imagekit/nodejs";
import { env } from "../../config/env.js";

type ImageKitUploadInput = {
	bytes: Buffer;
	fileName: string;
	folder: string;
	isPrivateFile?: boolean;
	tags?: string[];
};

function normalizeFolder(folder: string): string {
	const trimmed = folder.trim();
	if (!trimmed) {
		return "/";
	}

	const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

let cachedImageKitClient: ImageKit | null = null;

export function hasImageKitConfig(): boolean {
	return Boolean(env.imagekitPublicKey && env.imagekitPrivateKey && env.imagekitUrlEndpoint);
}

function getImageKitClient(): ImageKit {
	if (!hasImageKitConfig()) {
		throw new Error("ImageKit environment variables are missing.");
	}

	if (!cachedImageKitClient) {
		cachedImageKitClient = new ImageKit({
			privateKey: env.imagekitPrivateKey,
		});
	}

	return cachedImageKitClient;
}

export async function uploadBufferToImageKit(input: ImageKitUploadInput): Promise<{ filePath: string; url: string | null }> {
	const imagekit = getImageKitClient();
	const upload = await imagekit.files.upload({
		file: await ImageKit.toFile(input.bytes, input.fileName),
		fileName: input.fileName,
		folder: normalizeFolder(input.folder),
		useUniqueFileName: false,
		overwriteFile: false,
		isPrivateFile: input.isPrivateFile ?? false,
		tags: input.tags,
	});

	const filePath = typeof upload.filePath === "string" ? upload.filePath : "";
	if (!filePath) {
		throw new Error("ImageKit upload did not return a file path.");
	}

	return {
		filePath,
		url: typeof upload.url === "string" ? upload.url : null,
	};
}

export function createImageKitSignedUrl(filePath: string, expireSeconds = 60 * 10): string | null {
	if (!filePath || !hasImageKitConfig()) {
		return null;
	}

	try {
		const imagekit = getImageKitClient();
		return imagekit.helper.buildSrc({
			src: filePath,
			urlEndpoint: env.imagekitUrlEndpoint,
			signed: true,
			expiresIn: expireSeconds,
		});
	} catch {
		return null;
	}
}

export function getImageKitReadiness() {
	const missingConfig: string[] = [];

	if (!env.imagekitPublicKey) {
		missingConfig.push("IMAGEKIT_PUBLIC_KEY");
	}

	if (!env.imagekitPrivateKey) {
		missingConfig.push("IMAGEKIT_PRIVATE_KEY");
	}

	if (!env.imagekitUrlEndpoint) {
		missingConfig.push("IMAGEKIT_URL_ENDPOINT");
	}

	const configured = missingConfig.length === 0;
	const probeSignedUrl = configured
		? createImageKitSignedUrl(`${normalizeFolder(env.imagekitEvidenceFolder)}/health-probe.jpg`, 60)
		: null;

	return {
		provider: "imagekit",
		configured,
		missingConfig,
		folders: {
			evidence: normalizeFolder(env.imagekitEvidenceFolder),
			verificationIds: normalizeFolder(env.imagekitIdFolder),
		},
		probes: {
			signedUrlGeneration: Boolean(probeSignedUrl),
		},
	};
}

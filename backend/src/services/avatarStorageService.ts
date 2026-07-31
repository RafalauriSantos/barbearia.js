import { randomUUID } from "crypto";
import { AppError } from "../lib/errors";
const { env } = require("../config/env");
const supabase = require("../lib/supabase");

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

let bucketReady = false;

interface ParsedAvatar {
	buffer: Buffer;
	mimeType: string;
	extension: string;
}

function parseDataUrl(dataUrl: string): ParsedAvatar {
	const match = String(dataUrl || "").match(
		/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/u,
	);

	if (!match) {
		throw new AppError(
			400,
			"INVALID_AVATAR_IMAGE",
			"Envie uma imagem JPG, PNG ou WebP valida.",
		);
	}

	const mimeType = match[1];
	const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

	if (!buffer.length || buffer.length > MAX_AVATAR_BYTES) {
		throw new AppError(
			400,
			"INVALID_AVATAR_SIZE",
			"A foto precisa ter ate 2MB.",
		);
	}

	return {
		buffer,
		mimeType,
		extension: MIME_TO_EXTENSION[mimeType],
	};
}

async function ensureBucket(): Promise<void> {
	if (bucketReady) return;

	const { error } = await supabase.storage.createBucket(env.AVATAR_BUCKET, {
		public: true,
		fileSizeLimit: MAX_AVATAR_BYTES,
		allowedMimeTypes: Object.keys(MIME_TO_EXTENSION),
	});

	if (error) {
		const message = String(error.message || "").toLowerCase();
		const statusCode = Number(error.statusCode || error.status || 0);
		if (!message.includes("already exists") && statusCode !== 409) {
			throw error;
		}
	}

	bucketReady = true;
}

export interface UploadBarberAvatarPayload {
	barbeariaId: string;
	barbeiroId: string;
	dataUrl: string;
}

export async function uploadBarberAvatar({
	barbeariaId,
	barbeiroId,
	dataUrl,
}: UploadBarberAvatarPayload): Promise<string> {
	const { buffer, mimeType, extension } = parseDataUrl(dataUrl);
	await ensureBucket();

	const filePath = `${barbeariaId}/${barbeiroId}/${randomUUID()}.${extension}`;
	const { error } = await supabase.storage
		.from(env.AVATAR_BUCKET)
		.upload(filePath, buffer, {
			cacheControl: "31536000",
			contentType: mimeType,
			upsert: false,
		});

	if (error) throw error;

	const { data } = supabase.storage
		.from(env.AVATAR_BUCKET)
		.getPublicUrl(filePath);

	return data.publicUrl;
}

module.exports = { uploadBarberAvatar };
export default module.exports;

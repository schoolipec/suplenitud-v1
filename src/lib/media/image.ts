// Server-only image pipeline for CMS uploads. Decodes the real bytes (never the
// filename or declared Content-Type), enforces size/pixel limits and re-encodes
// to WebP with all metadata stripped. Imported by the upload route and the
// verify:cms-media script; it must not import the database client.
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const ALLOWED_INPUT_FORMATS = ["png", "jpeg", "webp"] as const;
export const OUTPUT_MIME_TYPE = "image/webp";
// Reject decompression bombs before decoding a full raster.
export const MAX_INPUT_DIMENSION = 6000;
export const MAX_INPUT_PIXELS = 24_000_000;
/** Longest edge of the stored image; larger uploads are scaled down, never up. */
export const MAX_OUTPUT_DIMENSION = 2400;
export const WEBP_QUALITY = 82;

export type ImageError = "empty" | "too_large" | "unsupported_type" | "too_many_pixels" | "processing_failed";

export type NormalizedImage = {
  data: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
};

export type NormalizeResult = {ok: true; image: NormalizedImage} | {ok: false; error: ImageError};

/**
 * Decode-and-reencode. The declared extension or Content-Type is ignored: only
 * the actual bytes decide the result. Metadata is dropped (no withMetadata call)
 * and the output is always WebP.
 */
export async function normalizeImage(input: Buffer): Promise<NormalizeResult> {
  if (!Buffer.isBuffer(input) || input.byteLength === 0) return {ok: false, error: "empty"};
  if (input.byteLength > MAX_UPLOAD_BYTES) return {ok: false, error: "too_large"};

  let metadata: {format?: string; width?: number; height?: number};
  try {
    metadata = await sharp(input, {limitInputPixels: MAX_INPUT_PIXELS, failOn: "error"}).metadata();
  } catch {
    return {ok: false, error: "unsupported_type"};
  }
  const format = metadata.format;
  if (format !== "png" && format !== "jpeg" && format !== "webp") return {ok: false, error: "unsupported_type"};
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 1 || height < 1) return {ok: false, error: "unsupported_type"};
  if (width > MAX_INPUT_DIMENSION || height > MAX_INPUT_DIMENSION || width * height > MAX_INPUT_PIXELS) {
    return {ok: false, error: "too_many_pixels"};
  }

  try {
    const {data, info} = await sharp(input, {limitInputPixels: MAX_INPUT_PIXELS, failOn: "error"})
      .rotate()
      .resize({width: MAX_OUTPUT_DIMENSION, height: MAX_OUTPUT_DIMENSION, fit: "inside", withoutEnlargement: true})
      .webp({quality: WEBP_QUALITY})
      .toBuffer({resolveWithObject: true});
    if (data.byteLength === 0 || data.byteLength > MAX_UPLOAD_BYTES) return {ok: false, error: "processing_failed"};
    return {ok: true, image: {data, mimeType: "image/webp", width: info.width, height: info.height, byteSize: data.byteLength}};
  } catch {
    return {ok: false, error: "processing_failed"};
  }
}

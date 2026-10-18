import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {MAX_UPLOAD_BYTES, normalizeImage, type ImageError} from "@/lib/media/image";
import {deleteMediaFile, isMediaStorageConfigured, mediaFileName, saveMediaFile} from "@/lib/media/storage";
import {createMediaRecord} from "@/lib/media/repository";

/** Safe, mapped errors: never leak paths, stack traces or server details. */
const STATUS_BY_ERROR: Record<ImageError | "missing_file" | "storage_unconfigured" | "storage_failed" | "save_failed", number> = {
  missing_file: 400,
  empty: 400,
  unsupported_type: 400,
  too_many_pixels: 400,
  too_large: 413,
  storage_unconfigured: 503,
  storage_failed: 500,
  save_failed: 500,
  processing_failed: 422,
};

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  if (!isMediaStorageConfigured()) return NextResponse.json({error: "storage_unconfigured"}, {status: 503});

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({error: "missing_file"}, {status: 400});
  if (file.size === 0) return NextResponse.json({error: "missing_file"}, {status: 400});
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({error: "too_large"}, {status: STATUS_BY_ERROR.too_large});

  const input = Buffer.from(await file.arrayBuffer());
  if (input.byteLength > MAX_UPLOAD_BYTES) return NextResponse.json({error: "too_large"}, {status: STATUS_BY_ERROR.too_large});

  // The declared name/type are ignored: only the decoded bytes decide.
  const normalized = await normalizeImage(input);
  if (!normalized.ok) return NextResponse.json({error: normalized.error}, {status: STATUS_BY_ERROR[normalized.error]});

  const id = randomUUID();
  const fileName = mediaFileName(id);
  try {
    const saved = await saveMediaFile(fileName, normalized.image.data);
    if (!saved) return NextResponse.json({error: "storage_unconfigured"}, {status: STATUS_BY_ERROR.storage_unconfigured});
  } catch {
    return NextResponse.json({error: "storage_failed"}, {status: STATUS_BY_ERROR.storage_failed});
  }

  try {
    await createMediaRecord({
      id,
      filename: fileName,
      mimeType: normalized.image.mimeType,
      byteSize: normalized.image.byteSize,
      width: normalized.image.width,
      height: normalized.image.height,
      createdById: actor.id,
    });
  } catch {
    // No orphaned file if the database write fails.
    await deleteMediaFile(fileName);
    return NextResponse.json({error: "save_failed"}, {status: STATUS_BY_ERROR.save_failed});
  }

  return NextResponse.json(
    {
      id,
      url: `/media/${id}`,
      mimeType: normalized.image.mimeType,
      width: normalized.image.width,
      height: normalized.image.height,
      byteSize: normalized.image.byteSize,
    },
    {status: 201},
  );
}

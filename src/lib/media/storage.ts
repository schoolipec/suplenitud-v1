import {randomUUID} from "node:crypto";
import {mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";

/**
 * External, env-configured storage for normalized CMS media. The directory is
 * never created at build time and is expected to be mounted as a persistent
 * volume in the future deployment. When the variable is empty, uploads stay
 * disabled and no filesystem access happens.
 */
const MEDIA_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function mediaStorageDir(): string | null {
  const value = process.env.CMS_MEDIA_DIR?.trim();
  return value ? value : null;
}

export function isMediaStorageConfigured(): boolean {
  return mediaStorageDir() !== null;
}

/** Opaque, unguessable id to file name. The original file name is never used. */
export function mediaFileName(id: string): string {
  return `${id}.webp`;
}

export function isSafeMediaId(id: string): boolean {
  return MEDIA_ID_PATTERN.test(id);
}

/** Only `<uuid>.webp` keys reach the filesystem, so traversal is impossible. */
export function isSafeMediaFileName(fileName: string): boolean {
  return MEDIA_FILENAME_PATTERN.test(fileName);
}

/** Atomic write: unique temp file in the same directory, then rename. */
export async function saveMediaFile(fileName: string, data: Buffer): Promise<boolean> {
  const dir = mediaStorageDir();
  if (!dir || !isSafeMediaFileName(fileName)) return false;
  await mkdir(dir, {recursive: true});
  const target = join(dir, fileName);
  const temp = join(dir, `.${fileName}.${randomUUID()}.tmp`);
  await writeFile(temp, data, {flag: "wx"});
  try {
    await rename(temp, target);
  } catch (error) {
    await rm(temp, {force: true});
    throw error;
  }
  return true;
}

export async function readMediaFile(fileName: string): Promise<Buffer | null> {
  const dir = mediaStorageDir();
  if (!dir || !isSafeMediaFileName(fileName)) return null;
  try {
    return await readFile(join(dir, fileName));
  } catch {
    return null;
  }
}

/** Rollback helper: removes a file written before a failed database insert. */
export async function deleteMediaFile(fileName: string): Promise<void> {
  const dir = mediaStorageDir();
  if (!dir || !isSafeMediaFileName(fileName)) return;
  try {
    await rm(join(dir, fileName), {force: true});
  } catch {
    // Best-effort cleanup; a leftover temp/orphan never breaks the request.
  }
}

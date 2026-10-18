import {findMediaRecord} from "@/lib/media/repository";
import {isSafeMediaId, readMediaFile} from "@/lib/media/storage";

/** Public read by opaque id. Unknown, malformed or unsafe ids return a plain 404. */
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!isSafeMediaId(id)) return notFound();
  const record = await findMediaRecord(id).catch(() => null);
  if (!record || record.mimeType !== "image/webp") return notFound();
  const data = await readMediaFile(record.filename);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {"Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"},
  });
}

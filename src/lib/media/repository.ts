import {prisma} from "@/lib/db/client";

export type MediaRecordInput = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  createdById: string | null;
};

/** Registers one normalized media file and its audit entry atomically. */
export async function createMediaRecord(input: MediaRecordInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.contentMedia.create({data: input});
    await tx.auditLog.create({
      data: {actorUserId: input.createdById, action: "CMS_MEDIA_UPLOADED", resource: "content_media", resourceId: input.id},
    });
  });
}

/** Reads the stored file name and MIME for the public delivery route. */
export async function findMediaRecord(id: string): Promise<{filename: string; mimeType: string} | null> {
  return prisma.contentMedia.findUnique({where: {id}, select: {filename: true, mimeType: true}});
}

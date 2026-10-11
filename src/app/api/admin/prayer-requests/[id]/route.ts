import {NextResponse} from "next/server";
import {requireSuperAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
const statuses = new Set(["NEW", "ASSIGNED", "CONTACTED", "CLOSED"]);
export async function PATCH(request: Request, {params}: {params: Promise<{id:string}>}) {
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"invalid_origin"},{status:403});
 const actor=await requireSuperAdmin(request); if(!actor)return NextResponse.json({error:"forbidden"},{status:403});
 const body=await request.json().catch(()=>null) as {status?:string;usherName?:string}|null; const {id}=await params;
 if(!body?.status||!statuses.has(body.status))return NextResponse.json({error:"invalid_status"},{status:400});
 const requestRecord=await prisma.prayerRequest.update({where:{id},data:{status:body.status as "NEW"}});
 if(body.usherName?.trim()) await prisma.prayerAssignment.create({data:{requestId:id,usherName:body.usherName.trim(),assignedById:actor.id}});
 await prisma.auditLog.create({data:{actorUserId:actor.id,action:"PRAYER_REQUEST_UPDATED",resource:"prayer_request",resourceId:id}});
 return NextResponse.json(requestRecord);
}

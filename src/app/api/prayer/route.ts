import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
export async function POST(request: Request) {
 const body=await request.json().catch(()=>null) as {name?:string;phoneOrWhatsApp?:string;email?:string;preferredContact?:string;consent?:boolean}|null;
 if(!body?.consent||!body.name?.trim()||!body.phoneOrWhatsApp?.trim()||!body.preferredContact?.trim())return NextResponse.json({error:"invalid_request"},{status:400});
 const created=await prisma.prayerRequest.create({data:{name:body.name.trim(),phoneOrWhatsApp:body.phoneOrWhatsApp.trim(),email:body.email?.trim()||null,preferredContact:body.preferredContact.trim(),consentedAt:new Date()}});
 return NextResponse.json({id:created.id},{status:201});
}

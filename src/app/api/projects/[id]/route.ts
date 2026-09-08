import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";
import { parseId, isValidProjectStatus, sanitizeTitle, sanitizeDescription, parseMaxMembers, parseDeadline, isValidProjectType, isValidProjectVisibility, TITLE_MIN, TITLE_MAX, DESCRIPTION_MIN, DESCRIPTION_MAX } from "@/lib/validation";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(); if (!authUser) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    const projectId = parseId((await params).id); if (projectId === null) return NextResponse.json({ error: "شناسه پروژه نامعتبر است" }, { status: 400 });
    const [project] = await db.select({ id: projects.id,title: projects.title,description: projects.description,status: projects.status,type: projects.type,creatorId: projects.creatorId,creatorRole: projects.creatorRole,visibility: projects.visibility,inviteToken: projects.inviteToken,professorId: projects.professorId,maxMembers: projects.maxMembers,deadline: projects.deadline,createdAt: projects.createdAt,updatedAt: projects.updatedAt,professorName: users.name,professorDepartment: users.department,professorUniversity: users.university,professorAvatar: users.avatar }).from(projects).innerJoin(users,eq(projects.creatorId,users.id)).where(eq(projects.id,projectId));
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    const [membership] = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,authUser.userId)));
    if (project.visibility === "private" && !membership && project.creatorId !== authUser.userId) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    const members = await db.select({ id: users.id,name: users.name,role: users.role,avatar: users.avatar,department: users.department,joinedAt: projectMembers.joinedAt }).from(projectMembers).innerJoin(users,eq(projectMembers.userId,users.id)).where(eq(projectMembers.projectId,projectId));
    let myApplication = null; if (authUser.role === "student") { const [app] = await db.select().from(applications).where(and(eq(applications.projectId,projectId),eq(applications.studentId,authUser.userId))); myApplication = app || null; }
    const memberCount = members.filter(m => m.id !== project.creatorId).length;
    return NextResponse.json({ project: { ...project, members, memberCount, myApplication, isMember: Boolean(membership) || project.creatorId === authUser.userId, isOwner: project.creatorId === authUser.userId, inviteLink: project.inviteToken ? `/invite/${project.inviteToken}` : null } });
  } catch (error) { console.error("Project GET error:",error); return NextResponse.json({ error:"خطای داخلی سرور" },{status:500}); }
}

export async function PATCH(req: NextRequest,{params}:Params){
  try { const authUser=await getAuthUser(); if(!authUser) return NextResponse.json({error:"احراز هویت نشده‌اید"},{status:401}); const projectId=parseId((await params).id); if(projectId===null)return NextResponse.json({error:"شناسه پروژه نامعتبر است"},{status:400}); const [existing]=await db.select().from(projects).where(eq(projects.id,projectId)); if(!existing)return NextResponse.json({error:"پروژه یافت نشد"},{status:404}); if(existing.creatorId!==authUser.userId)return NextResponse.json({error:"دسترسی مجاز نیست"},{status:403}); const body=await req.json(); const update:any={updatedAt:new Date()};
    if(body.title!==undefined){const v=sanitizeTitle(body.title);if(v===null)return NextResponse.json({error:`عنوان باید بین ${TITLE_MIN} تا ${TITLE_MAX} کاراکتر باشد`},{status:400});update.title=v;}
    if(body.description!==undefined){const v=sanitizeDescription(body.description);if(v===null)return NextResponse.json({error:`توضیحات باید بین ${DESCRIPTION_MIN} تا ${DESCRIPTION_MAX} کاراکتر باشد`},{status:400});update.description=v;}
    if(body.status!==undefined){if(!isValidProjectStatus(body.status))return NextResponse.json({error:"مقدار وضعیت نامعتبر است"},{status:400});update.status=body.status;}
    if(body.type!==undefined){if(!isValidProjectType(body.type))return NextResponse.json({error:"نوع پروژه نامعتبر است"},{status:400});update.type=body.type;}
    if(body.visibility!==undefined){if(!isValidProjectVisibility(body.visibility))return NextResponse.json({error:"نوع دسترسی پروژه نامعتبر است"},{status:400});update.visibility=body.visibility;if(body.visibility==="private"&&existing.inviteToken===null)update.inviteToken=crypto.randomBytes(32).toString("hex");if(body.visibility==="public")update.inviteToken=null;}
    if(body.maxMembers!==undefined){const m=parseMaxMembers(body.maxMembers);if(m===null)return NextResponse.json({error:"حداکثر تعداد اعضا باید یک عدد صحیح مثبت باشد"},{status:400});const [{count}]=await db.select({count:sql<number>`count(*)::int`}).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),sql`${projectMembers.userId} <> ${existing.creatorId}`));if(m<count)return NextResponse.json({error:`حداکثر تعداد اعضا نمی‌تواند کمتر از تعداد اعضای فعلی باشد (${count})`},{status:409});update.maxMembers=m;}
    if(body.deadline!==undefined){const d=parseDeadline(body.deadline);if(!d.ok)return NextResponse.json({error:"تاریخ مهلت نامعتبر است"},{status:400});update.deadline=d.value;}
    if(body.regenerateInviteToken===true){update.inviteToken=crypto.randomBytes(32).toString("hex");}
    if(body.revokeInviteToken===true){update.inviteToken=null;}
    const [updated]=await db.update(projects).set(update).where(eq(projects.id,projectId)).returning(); return NextResponse.json({message:"پروژه به‌روزرسانی شد",project:updated});
  } catch(error){console.error("Project PATCH error:",error);return NextResponse.json({error:"خطای داخلی سرور"},{status:500});}
}

export async function DELETE(_req:NextRequest,{params}:Params){try{const authUser=await getAuthUser();if(!authUser)return NextResponse.json({error:"احراز هویت نشده‌اید"},{status:401});const projectId=parseId((await params).id);if(projectId===null)return NextResponse.json({error:"شناسه پروژه نامعتبر است"},{status:400});const [existing]=await db.select().from(projects).where(eq(projects.id,projectId));if(!existing)return NextResponse.json({error:"پروژه یافت نشد"},{status:404});if(existing.creatorId!==authUser.userId)return NextResponse.json({error:"دسترسی مجاز نیست"},{status:403});await db.delete(projects).where(eq(projects.id,projectId));auditLog("project_deleted",{projectId,creatorId:authUser.userId,title:existing.title});return NextResponse.json({message:"پروژه حذف شد"});}catch(error){console.error("Project DELETE error:",error);return NextResponse.json({error:"خطای داخلی سرور"},{status:500});}}

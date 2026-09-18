/*src\app\api\projects\[id]\messages\[messageId]\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { chatMessages, projectFiles, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { parseId } from "@/lib/validation";
import { getProjectAccess } from "@/lib/projectAccess";
import { auditLog } from "@/lib/auditLog";

type Params = { params: Promise<{ id: string; messageId: string }> };

// Shared by PATCH and DELETE: confirms the requester is a project member
// AND the sender of this exact message. Ownership is always taken from
// the database row itself, never from anything the client sends.
async function loadOwnMessage(
  projectId: number,
  messageId: number,
  userId: number
) {
  const { project, isMember } = await getProjectAccess(projectId, userId);

  if (!project)
    return {
      error: NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 }),
    } as const;
  if (!isMember)
    return {
      error: NextResponse.json({ error: "دسترسی رد شد" }, { status: 403 }),
    } as const;

  const [message] = await db
    .select()
    .from(chatMessages)
    .where(
      and(eq(chatMessages.id, messageId), eq(chatMessages.projectId, projectId))
    );

  if (!message)
    return {
      error: NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 }),
    } as const;

  // ج.۹ — فقط فرستنده‌ی پیام؛ برخلاف حذف فایل، مالکیت پروژه اینجا
  // استثنا محسوب نمی‌شود (طبق دستور صریح مأموریت).
  if (message.senderId !== userId) {
    return {
      error: NextResponse.json(
        { error: "شما فقط می‌توانید پیام خودتان را ویرایش یا حذف کنید" },
        { status: 403 }
      ),
    } as const;
  }

  return { message } as const;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id, messageId } = await params;
    const projectId = parseId(id);
    const parsedMessageId = parseId(messageId);
    if (projectId === null || parsedMessageId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }

    const result = await loadOwnMessage(
      projectId,
      parsedMessageId,
      authUser.userId
    );
    if ("error" in result) return result.error;

    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "متن پیام الزامی است" },
        { status: 400 }
      );
    }
    // همان محدودیت طول متن پیام که در POST /messages اعمال می‌شود.
    if (content.length > 2000) {
      return NextResponse.json(
        { error: "متن پیام بیش از حد طولانی است" },
        { status: 400 }
      );
    }

    await db
      .update(chatMessages)
      .set({ content })
      .where(eq(chatMessages.id, parsedMessageId));

    const [sender] = await db
      .select({ name: users.name, avatar: users.avatar, role: users.role })
      .from(users)
      .where(eq(users.id, authUser.userId));

    const [attachment] = await db
      .select({
        id: projectFiles.id,
        fileName: projectFiles.fileName,
        fileUrl: projectFiles.fileUrl,
        fileSize: projectFiles.fileSize,
      })
      .from(projectFiles)
      .where(eq(projectFiles.chatMessageId, parsedMessageId));

    auditLog("message_edited", {
      projectId,
      messageId: parsedMessageId,
      senderId: authUser.userId,
    });

    return NextResponse.json({
      message: {
        id: parsedMessageId,
        projectId,
        senderId: authUser.userId,
        content,
        type: result.message.type,
        createdAt: result.message.createdAt,
        senderName: sender?.name ?? "",
        senderAvatar: sender?.avatar ?? null,
        senderRole: sender?.role ?? "",
        attachment: attachment ?? null,
      },
    });
  } catch (error) {
    console.error("Message PATCH error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id, messageId } = await params;
    const projectId = parseId(id);
    const parsedMessageId = parseId(messageId);
    if (projectId === null || parsedMessageId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }

    const result = await loadOwnMessage(
      projectId,
      parsedMessageId,
      authUser.userId
    );
    if ("error" in result) return result.error;

    // ج.۱۰ — طبق تصمیم تأییدشده: قبل از حذف پیام، هر فایل ضمیمه‌ی آن را
    // اول از Vercel Blob پاک می‌کنیم (دقیقاً همان منطق
    // DELETE /api/projects/[id]/files/[fileId])، سپس خود پیام را حذف
    // می‌کنیم. حذف ردیف chatMessages به‌واسطه‌ی onDelete:"cascade" روی
    // projectFiles.chatMessageId، ردیف فایل را هم خودکار از دیتابیس پاک
    // می‌کند — نیازی به حذف دستی آن ردیف نیست.
    const attachedFiles = await db
      .select({ id: projectFiles.id, fileUrl: projectFiles.fileUrl })
      .from(projectFiles)
      .where(eq(projectFiles.chatMessageId, parsedMessageId));

    for (const file of attachedFiles) {
      try {
        await del(file.fileUrl);
      } catch (blobError) {
        // Blob may already be missing the object; don't block the delete.
        console.error("Message attachment blob delete error:", blobError);
      }
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, parsedMessageId));

    auditLog("message_deleted", {
      projectId,
      messageId: parsedMessageId,
      senderId: authUser.userId,
      hadAttachment: attachedFiles.length > 0,
    });

    return NextResponse.json({ message: "پیام حذف شد" });
  } catch (error) {
    console.error("Message DELETE error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

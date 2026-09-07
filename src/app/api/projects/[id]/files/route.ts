/*src\app\api\projects\[id]\files\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { projectFiles, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import {
  parseId,
  isValidFileContext,
  validateFileType,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_EXTENSIONS_LABEL,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { getProjectAccess } from "@/lib/projectAccess";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { project, isMember } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const contextParam = req.nextUrl.searchParams.get("context");
    if (contextParam && !isValidFileContext(contextParam)) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: projectFiles.id,
        projectId: projectFiles.projectId,
        uploaderId: projectFiles.uploaderId,
        fileName: projectFiles.fileName,
        fileUrl: projectFiles.fileUrl,
        fileSize: projectFiles.fileSize,
        context: projectFiles.context,
        chatMessageId: projectFiles.chatMessageId,
        createdAt: projectFiles.createdAt,
        uploaderName: users.name,
      })
      .from(projectFiles)
      .innerJoin(users, eq(projectFiles.uploaderId, users.id))
      .where(
        contextParam
          ? and(
              eq(projectFiles.projectId, projectId),
              eq(projectFiles.context, contextParam)
            )
          : eq(projectFiles.projectId, projectId)
      )
      .orderBy(desc(projectFiles.createdAt));

    return NextResponse.json({ files: rows });
  } catch (error) {
    console.error("Project files GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // 1. authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // 2. project existence
    const { project, isOwner, isMember } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 3. membership
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const context = formData.get("context");
    if (!isValidFileContext(context)) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }

    // Only the project owner may upload the final deliverable, and only
    // once the project has actually reached "completed" (ج.۹).
    if (context === "deliverable") {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Only the project owner can upload the final deliverable" },
          { status: 403 }
        );
      }
      if (project.status !== "completed") {
        return NextResponse.json(
          {
            error:
              "The final deliverable can only be uploaded once the project is marked as completed",
          },
          { status: 409 }
        );
      }
    }

    const chatMessageIdRaw = formData.get("chatMessageId");
    let chatMessageId: number | null = null;
    if (context === "chat" && typeof chatMessageIdRaw === "string" && chatMessageIdRaw) {
      const parsed = parseId(chatMessageIdRaw);
      if (parsed === null) {
        return NextResponse.json(
          { error: "Invalid chat message ID" },
          { status: 400 }
        );
      }
      chatMessageId = parsed;
    }

    // 4. file existence
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 5. file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10MB size limit" },
        { status: 400 }
      );
    }

    // 6. MIME/type
    const ext = validateFileType(file.name, file.type);
    if (!ext) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Allowed: ${ALLOWED_FILE_EXTENSIONS_LABEL}`,
        },
        { status: 400 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(
        "Project files POST error: BLOB_READ_WRITE_TOKEN is not configured"
      );
      return NextResponse.json(
        { error: "File storage is not configured" },
        { status: 500 }
      );
    }

    // 7. upload to Blob
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `projects/${projectId}/${context}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // 8. database insert
    const [saved] = await db
      .insert(projectFiles)
      .values({
        projectId,
        uploaderId: authUser.userId,
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        context,
        chatMessageId,
      })
      .returning();

    const [uploader] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, authUser.userId));

    auditLog("project_file_uploaded", {
      projectId,
      fileId: saved.id,
      context,
      uploaderId: authUser.userId,
      fileSize: file.size,
    });

    return NextResponse.json(
      { file: { ...saved, uploaderName: uploader?.name ?? "" } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Project files POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

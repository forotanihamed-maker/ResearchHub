// src/app/api/projects/[id]/files/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getStorageKind, saveFile } from "@/lib/storage";
import { reportServerError } from "@/lib/errorCapture";
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
  type FileContext,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { getProjectAccess } from "@/lib/projectAccess";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

// Upload rate limit: per USER (not per project), shared by every context
// (chat / document / deliverable). This limits how OFTEN a user may upload;
// it is NOT a size limit — the size cap (MAX_FILE_SIZE_BYTES) is checked
// separately below. Counters are in-memory and per server instance (see
// lib/rateLimit.ts), so the real ceiling is "limit × warm instances".
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_MAX_PER_WINDOW = 10;

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

    if (contextParam !== null && !isValidFileContext(contextParam)) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
    }

    const validContext: FileContext | null = contextParam;

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
        validContext
          ? and(
              eq(projectFiles.projectId, projectId),
              eq(projectFiles.context, validContext)
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
          {
            error: "Only the project owner can upload the final deliverable",
          },
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

    if (
      context === "chat" &&
      typeof chatMessageIdRaw === "string" &&
      chatMessageIdRaw
    ) {
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

    if (!getStorageKind()) {
      console.error(
        "Project files POST error: file storage is not configured (S3_* or BLOB_READ_WRITE_TOKEN)"
      );

      return NextResponse.json(
        { error: "File storage is not configured" },
        { status: 500 }
      );
    }

    // Rate limit. Deliberately placed AFTER authentication, project access,
    // role/status checks, context + file validation and the storage-config
    // check, so denied or invalid requests never use up the user's quota, and
    // right BEFORE the first expensive step (the Blob write).
    // checkRateLimit() checks and increments in one synchronous step, so
    // concurrent requests cannot slip past it.
    const rl = checkRateLimit(
      `upload:${authUser.userId}`,
      UPLOAD_MAX_PER_WINDOW,
      UPLOAD_WINDOW_MS
    );

    if (!rl.allowed) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((rl.resetAt - Date.now()) / 1000)
      );

      auditLog("file_upload_rate_limited", {
        userId: authUser.userId,
        projectId,
      });

      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    // 7. upload to Blob
    // Keep the END of the name (the extension) and cap the length: storage keys have a limit.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);

    const pathname = `projects/${projectId}/${context}/${Date.now()}-${safeName}`;

    // "projects/<id>/<context>/<timestamp>-<name>"; the Blob driver adds its own random suffix.
    const storedRef = await saveFile(pathname, file);

    // 8. database insert
    const [saved] = await db
      .insert(projectFiles)
      .values({
        projectId,
        uploaderId: authUser.userId,
        fileName: file.name,
        fileUrl: storedRef,
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
      {
        file: {
          ...saved,
          uploaderName: uploader?.name ?? "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Project files POST error:", error);
    // So the dev assistant / panel sees the real cause (message only, masked).
    await reportServerError("/api/projects/[id]/files POST", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

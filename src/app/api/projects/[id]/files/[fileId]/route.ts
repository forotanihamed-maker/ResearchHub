/*src\app\api\projects\[id]\files\[fileId]\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { deleteFile, openFile } from "@/lib/storage";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { parseId } from "@/lib/validation";
import { getProjectAccess } from "@/lib/projectAccess";
import { auditLog } from "@/lib/auditLog";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fileId } = await params;
    const projectId = parseId(id);
    const parsedFileId = parseId(fileId);

    if (projectId === null || parsedFileId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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

    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.id, parsedFileId),
          eq(projectFiles.projectId, projectId)
        )
      );

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const result = await openFile(file.fileUrl);

    if (!result) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const encodedFileName = encodeURIComponent(file.fileName);

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": String(result.size ?? file.fileSize),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Project file GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fileId } = await params;
    const projectId = parseId(id);
    const parsedFileId = parseId(fileId);
    if (projectId === null || parsedFileId === null) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { project, isOwner } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.id, parsedFileId),
          eq(projectFiles.projectId, projectId)
        )
      );

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // ج.۶ — only the uploader OR the project owner may delete a file.
    const isUploader = file.uploaderId === authUser.userId;
    if (!isUploader && !isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      await deleteFile(file.fileUrl);
    } catch (blobError) {
      // Blob storage may already be missing the object (e.g. manual
      // cleanup); don't block removing the database record over it.
      console.error("Project file storage delete error:", blobError);
    }

    await db.delete(projectFiles).where(eq(projectFiles.id, parsedFileId));

    auditLog("project_file_deleted", {
      projectId,
      fileId: parsedFileId,
      deletedBy: authUser.userId,
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Project file DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

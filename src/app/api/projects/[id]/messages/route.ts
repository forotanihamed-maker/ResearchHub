/*src\app\api\projects\[id]\massages\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, projectMembers, users, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const MESSAGE_LIMIT = 50;
const CHAT_WINDOW_MS = 60 * 1000; // 1 minute
const CHAT_MAX_MESSAGES_PER_WINDOW = 20; // ~1 message every 3s, generous for real chat use

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Only members can see messages
    // Check whether the user is the professor who owns the project
    const [ownedProject] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.professorId, authUser.userId)
        )
      );

    // Check whether the user is a project member
    const [isMember] = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, authUser.userId)
        )
      );

    if (!ownedProject && !isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const recentMessages = await db
      .select({
        id: chatMessages.id,
        projectId: chatMessages.projectId,
        senderId: chatMessages.senderId,
        content: chatMessages.content,
        type: chatMessages.type,
        createdAt: chatMessages.createdAt,
        senderName: users.name,
        senderAvatar: users.avatar,
        senderRole: users.role,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.projectId, projectId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(MESSAGE_LIMIT);

    // We fetched newest-first to apply the LIMIT; reverse back to
    // chronological order for display.
    const messages = recentMessages.reverse();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 }
      );
    }

    const rateLimitKey = `chat:${projectId}:${authUser.userId}`;
    const rl = checkRateLimit(
      rateLimitKey,
      CHAT_MAX_MESSAGES_PER_WINDOW,
      CHAT_WINDOW_MS
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Check membership
    const [isMember] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, authUser.userId)
        )
      );

    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [message] = await db
      .insert(chatMessages)
      .values({
        projectId,
        senderId: authUser.userId,
        content: content.trim(),
        type: "text",
      })
      .returning();

    const [sender] = await db
      .select({ name: users.name, avatar: users.avatar, role: users.role })
      .from(users)
      .where(eq(users.id, authUser.userId));

    return NextResponse.json(
      {
        message: {
          ...message,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          senderRole: sender.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

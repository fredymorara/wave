import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications, broadcasts, broadcastReads } from "@/db/schema";
import { headers } from "next/headers";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Fetch user notifications
    const userNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    // Fetch broadcasts with read status
    const broadcastList = await db
      .select({
        id: broadcasts.id,
        title: broadcasts.title,
        message: broadcasts.message,
        linkUrl: broadcasts.linkUrl,
        linkLabel: broadcasts.linkLabel,
        createdAt: broadcasts.createdAt,
        readAt: broadcastReads.readAt,
      })
      .from(broadcasts)
      .leftJoin(
        broadcastReads,
        and(
          eq(broadcastReads.broadcastId, broadcasts.id),
          eq(broadcastReads.userId, userId)
        )
      )
      .orderBy(desc(broadcasts.createdAt))
      .limit(10);

    // Merge and format
    const merged = [
      ...userNotifs.map(n => ({
        ...n,
        isBroadcast: false
      })),
      ...broadcastList.map(b => ({
        id: b.id,
        type: "admin_broadcast",
        title: b.title,
        message: b.message,
        linkUrl: b.linkUrl,
        linkLabel: b.linkLabel,
        actorName: "Admin",
        read: !!b.readAt,
        createdAt: b.createdAt,
        isBroadcast: true
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = merged.filter(n => !n.read).length;

    return NextResponse.json({ items: merged, unreadCount });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));

    if (body.markAllRead) {
      // Mark all personal notifications read
      await db.update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

      // Insert read rows for all unread broadcasts
      const unreadBroadcasts = await db
        .select({ id: broadcasts.id })
        .from(broadcasts)
        .leftJoin(
          broadcastReads,
          and(
            eq(broadcastReads.broadcastId, broadcasts.id),
            eq(broadcastReads.userId, userId)
          )
        )
        .where(sql`${broadcastReads.id} IS NULL`);

      if (unreadBroadcasts.length > 0) {
        await db.insert(broadcastReads).values(
          unreadBroadcasts.map(b => ({
            id: crypto.randomUUID(),
            userId,
            broadcastId: b.id,
            readAt: new Date(),
          }))
        ).onConflictDoNothing();
      }

      return NextResponse.json({ success: true });
    }

    if (body.notificationIds && Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      await db.update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, userId),
            inArray(notifications.id, body.notificationIds)
          )
        );
    }

    if (body.broadcastIds && Array.isArray(body.broadcastIds) && body.broadcastIds.length > 0) {
      const values = body.broadcastIds.map((id: string) => ({
        id: crypto.randomUUID(),
        userId,
        broadcastId: id,
        readAt: new Date(),
      }));
      await db.insert(broadcastReads).values(values).onConflictDoNothing();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(notifications).where(
      and(
        eq(notifications.id, String(body.id)),
        eq(notifications.userId, session.user.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

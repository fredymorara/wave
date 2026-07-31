import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchHistory } from "@/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { animeId } = await params;

    const rows = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, session.user.id),
          eq(watchHistory.animeId, animeId)
        )
      )
      .limit(1);

    return NextResponse.json({ item: rows[0] || null });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { animeId } = await params;

    await db
      .delete(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, session.user.id),
          eq(watchHistory.animeId, animeId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Progress delete error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

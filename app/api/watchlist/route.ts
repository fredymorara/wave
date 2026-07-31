import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await db.select().from(watchlist).where(eq(watchlist.userId, session.user.id));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { animeId } = await req.json();
    if (!animeId) return NextResponse.json({ error: "Missing animeId" }, { status: 400 });

    // Check if exists
    const existing = await db.select().from(watchlist)
      .where(and(eq(watchlist.userId, session.user.id), eq(watchlist.animeId, String(animeId))))
      .limit(1);

    if (existing.length > 0) {
      // Toggle off
      await db.delete(watchlist).where(eq(watchlist.id, existing[0].id));
      return NextResponse.json({ action: "removed" });
    } else {
      // Toggle on
      await db.insert(watchlist).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        animeId: String(animeId),
        createdAt: new Date(),
      });
      return NextResponse.json({ action: "added" });
    }
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

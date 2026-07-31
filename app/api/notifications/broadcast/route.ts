import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { title, message, linkUrl, linkLabel } = await req.json().catch(() => ({}));

    if (!title || !message) {
      return NextResponse.json({ error: "Missing title or message" }, { status: 400 });
    }

    let sanitizedLinkUrl: string | null = null;
    if (linkUrl && typeof linkUrl === "string") {
      const trimmed = linkUrl.trim();
      if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        sanitizedLinkUrl = trimmed;
      }
    }

    const newBroadcast = await db.insert(broadcasts).values({
      id: crypto.randomUUID(),
      title: String(title).trim(),
      message: String(message).trim(),
      linkUrl: sanitizedLinkUrl,
      linkLabel: linkLabel ? String(linkLabel).trim() : null,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ broadcast: newBroadcast[0] });
  } catch (error) {
    console.error("Error creating broadcast:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

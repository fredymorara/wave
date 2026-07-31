import { NextResponse } from "next/server";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const broadcastsList = await db
      .select()
      .from(broadcasts)
      .orderBy(desc(broadcasts.createdAt))
      .limit(50); // Get latest 50 broadcasts

    return NextResponse.json({ broadcasts: broadcastsList });
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews, user, comments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql, desc, gte, count } from "drizzle-orm";
import { anilistApi } from "@/lib/api/anilist";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d"; // "7d", "30d", "90d"
    
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total Page Views in range
    const totalViewsRes = await db
      .select({ value: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate));
    const totalPageViews = totalViewsRes[0]?.value || 0;

    // Unique Visitors in range
    const uniqueVisitorsRes = await db
      .select({ value: count(sql`DISTINCT ${pageViews.visitorHash}`) })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate));
    const uniqueVisitors = uniqueVisitorsRes[0]?.value || 0;

    // Registered Users count (all time)
    const usersRes = await db.select({ value: count() }).from(user);
    const totalUsers = usersRes[0]?.value || 0;

    // Total Comments (all time)
    const commentsRes = await db.select({ value: count() }).from(comments);
    const totalComments = commentsRes[0]?.value || 0;

    // Daily Traffic
    const dailyViewsRes = await db
      .select({
        date: sql<string>`DATE(${pageViews.createdAt})`,
        views: count(),
        visitors: count(sql`DISTINCT ${pageViews.visitorHash}`)
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(sql`DATE(${pageViews.createdAt})`)
      .orderBy(sql`DATE(${pageViews.createdAt}) ASC`);

    // Top Pages
    const topPagesRes = await db
      .select({
        path: pageViews.path,
        views: count()
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    // Top Anime
    const topAnimeDbRes = await db
      .select({
        animeId: pageViews.animeId,
        views: count()
      })
      .from(pageViews)
      .where(
        sql`${pageViews.createdAt} >= ${startDate} AND ${pageViews.animeId} IS NOT NULL`
      )
      .groupBy(pageViews.animeId)
      .orderBy(desc(count()))
      .limit(10);

    // Fetch titles from AniList
    const topAnimeIds = topAnimeDbRes.map(a => Number(a.animeId)).filter(id => !isNaN(id));
    const titlesMap = await anilistApi.getAnimeTitlesByIds(topAnimeIds);

    const topAnimeRes = topAnimeDbRes.map(a => ({
      animeId: a.animeId,
      title: titlesMap[Number(a.animeId)] || `Unknown (ID: ${a.animeId})`,
      views: a.views
    }));

    return NextResponse.json({
      totalPageViews,
      uniqueVisitors,
      totalUsers,
      totalComments,
      dailyViews: dailyViewsRes,
      topPages: topPagesRes,
      topAnime: topAnimeRes
    });

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews, user, comments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql, desc, gte, lt, and, count } from "drizzle-orm";
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
    const range = (url.searchParams.get("range") || "7d").toLowerCase(); // "24h", "7d", "30d", "90d"
    
    const now = new Date();
    let msRange: number;
    let isHourly = false;

    if (range === "24h") {
      msRange = 24 * 60 * 60 * 1000;
      isHourly = true;
    } else if (range === "30d") {
      msRange = 30 * 24 * 60 * 60 * 1000;
    } else if (range === "90d") {
      msRange = 90 * 24 * 60 * 60 * 1000;
    } else {
      // default "7d"
      msRange = 7 * 24 * 60 * 60 * 1000;
    }

    const startDate = new Date(now.getTime() - msRange);
    const priorStartDate = new Date(now.getTime() - (msRange * 2));

    // 1. Current Period: Total Page Views
    const totalViewsRes = await db
      .select({ value: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate));
    const totalPageViews = totalViewsRes[0]?.value || 0;

    // 2. Current Period: Unique Visitors
    const uniqueVisitorsRes = await db
      .select({ value: count(sql`DISTINCT ${pageViews.visitorHash}`) })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate));
    const uniqueVisitors = uniqueVisitorsRes[0]?.value || 0;

    // 3. Prior Period: Views & Visitors for Growth Deltas
    const priorViewsRes = await db
      .select({ value: count() })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, priorStartDate), lt(pageViews.createdAt, startDate)));
    const priorViews = priorViewsRes[0]?.value || 0;

    const priorVisitorsRes = await db
      .select({ value: count(sql`DISTINCT ${pageViews.visitorHash}`) })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, priorStartDate), lt(pageViews.createdAt, startDate)));
    const priorVisitors = priorVisitorsRes[0]?.value || 0;

    const viewsDeltaPct = priorViews > 0
      ? Number((((totalPageViews - priorViews) / priorViews) * 100).toFixed(1))
      : 0;

    const visitorsDeltaPct = priorVisitors > 0
      ? Number((((uniqueVisitors - priorVisitors) / priorVisitors) * 100).toFixed(1))
      : 0;

    // 4. All-Time Counters
    const usersRes = await db.select({ value: count() }).from(user);
    const totalUsers = usersRes[0]?.value || 0;

    const commentsRes = await db.select({ value: count() }).from(comments);
    const totalComments = commentsRes[0]?.value || 0;

    // 5. Timeline Traffic (Hourly for 24h, Daily for others)
    const dateGrouping = isHourly
      ? sql<string>`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD HH24:00')`
      : sql<string>`DATE(${pageViews.createdAt})`;

    const dailyViewsRes = await db
      .select({
        date: dateGrouping,
        views: count(),
        visitors: count(sql`DISTINCT ${pageViews.visitorHash}`)
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(dateGrouping)
      .orderBy(dateGrouping);

    // 6. Peak Surge & Engagement Ratio
    let peakDate = "";
    let peakViews = 0;
    for (const d of dailyViewsRes) {
      if (d.views > peakViews) {
        peakViews = d.views;
        peakDate = String(d.date);
      }
    }

    const avgViewsPerVisitor = uniqueVisitors > 0
      ? Number((totalPageViews / uniqueVisitors).toFixed(1))
      : 0;

    // 7. Time of Day Distribution (Hourly buckets)
    const timeOfDayRes = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${pageViews.createdAt})`,
        views: count()
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(sql`EXTRACT(HOUR FROM ${pageViews.createdAt})`);

    const dayParts = {
      night: 0,     // 00:00 - 06:00
      morning: 0,   // 06:00 - 12:00
      afternoon: 0, // 12:00 - 18:00
      evening: 0,   // 18:00 - 24:00
    };

    for (const row of timeOfDayRes) {
      const h = Number(row.hour);
      const c = Number(row.views);
      if (h < 6) dayParts.night += c;
      else if (h < 12) dayParts.morning += c;
      else if (h < 18) dayParts.afternoon += c;
      else dayParts.evening += c;
    }

    // 8. Top Pages
    const topPagesRes = await db
      .select({
        path: pageViews.path,
        views: count()
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, startDate))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(8);

    // 9. Top Anime
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
      .limit(8);

    const topAnimeIds = topAnimeDbRes.map(a => Number(a.animeId)).filter(id => !isNaN(id));
    let titlesMap: Record<number, string> = {};
    try {
      titlesMap = await anilistApi.getAnimeTitlesByIds(topAnimeIds);
    } catch {
      // Fallback if AniList is rate limited
    }

    const topAnimeRes = topAnimeDbRes.map(a => ({
      animeId: a.animeId,
      title: titlesMap[Number(a.animeId)] || `Anime #${a.animeId}`,
      views: a.views
    }));

    return NextResponse.json({
      range,
      totalPageViews,
      uniqueVisitors,
      totalUsers,
      totalComments,
      viewsDeltaPct,
      visitorsDeltaPct,
      avgViewsPerVisitor,
      peakDate,
      peakViews,
      dayParts,
      dailyViews: dailyViewsRes,
      topPages: topPagesRes,
      topAnime: topAnimeRes
    });

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

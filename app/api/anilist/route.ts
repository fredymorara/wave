import { NextResponse } from "next/server";

const ANILIST_API_URL = "https://graphql.anilist.co";

const ANILIST_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Origin": "https://anilist.co",
  "Referer": "https://anilist.co/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: ANILIST_HEADERS,
      body: JSON.stringify(body),
      // Next.js caching policy
      next: { revalidate: 300 }, // 5 minutes cache for repeated queries
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Parse Retry-After header if present, otherwise default to 2s
        const retryAfterHeader = response.headers.get("Retry-After");
        const delayMs = retryAfterHeader ? Math.max(1000, Number(retryAfterHeader) * 1000) : 2000;
        await new Promise((res) => setTimeout(res, Math.min(delayMs, 5000)));

        const retry = await fetch(ANILIST_API_URL, {
          method: "POST",
          headers: ANILIST_HEADERS,
          body: JSON.stringify(body),
        });

        if (retry.ok) {
          const retryData = await retry.json();
          return NextResponse.json(retryData, {
            status: 200,
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
          });
        }

        const retryData = await retry.json().catch(() => null);
        return NextResponse.json(
          retryData || { errors: [{ message: `AniList rate limited (${retry.status})` }] },
          { status: retry.status }
        );
      }

      const errorText = await response.text();
      // If AniList returns 403 due to their API being disabled or Cloudflare blocked, translate to 503 Service Unavailable
      const statusToReturn = response.status === 403 ? 503 : response.status;
      return NextResponse.json(
        { errors: [{ message: `AniList upstream service unavailable (${response.status}): ${errorText}` }] },
        { 
          status: statusToReturn,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          }
        }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    console.error("AniList proxy error:", error);
    const message = error instanceof Error ? error.message : "Failed to proxy request to AniList";
    return NextResponse.json(
      { errors: [{ message }] },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

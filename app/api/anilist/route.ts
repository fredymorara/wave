import { NextResponse } from 'next/server';

const ANILIST_API_URL = "https://graphql.anilist.co";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(body),
      // Next.js caching policy
      next: { revalidate: 300 }, // 5 minutes cache for repeated queries
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Simple backoff retry on server
        await new Promise((res) => setTimeout(res, 1500));
        const retry = await fetch(ANILIST_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: JSON.stringify(body),
        });

        const retryData = await retry.json();
        return NextResponse.json(retryData, { status: retry.status });
      }

      const errorText = await response.text();
      return NextResponse.json(
        { errors: [{ message: `AniList responded with status ${response.status}: ${errorText}` }] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("AniList proxy error:", error);
    return NextResponse.json(
      { errors: [{ message: error?.message || "Failed to proxy request to AniList" }] },
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

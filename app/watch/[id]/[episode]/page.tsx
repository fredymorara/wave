import type { Metadata } from "next";
import { Suspense } from "react";
import WatchClient from "./WatchClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; episode: string }>;
}): Promise<Metadata> {
  const { episode } = await params;
  return { title: `Watch Anime Episode ${episode} | Wave Anime` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; episode: string }>;
}) {
  const { id, episode } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-black flex items-center justify-center text-neon-crimson font-mono text-sm tracking-widest uppercase">INITIALIZING FEED...</div>}>
      <WatchClient id={id} episode={episode} />
    </Suspense>
  );
}

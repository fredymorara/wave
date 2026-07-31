import { Suspense } from "react";
import WatchClient from "./WatchClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; episode: string }>;
}) {
  const { id, episode } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-black flex items-center justify-center text-neon-crimson">Loading...</div>}>
      <WatchClient id={id} episode={episode} />
    </Suspense>
  );
}

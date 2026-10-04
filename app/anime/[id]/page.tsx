import type { Metadata } from "next";
import AnimeClient from "./AnimeClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: `Watch Anime | Wave Anime` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnimeClient id={id} />;
}

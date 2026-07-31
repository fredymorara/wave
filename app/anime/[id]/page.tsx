import AnimeClient from "./AnimeClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnimeClient id={id} />;
}

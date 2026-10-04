import HomeClient from "./HomeClient";

// SURVIVAL MODE: Reverting to static shell so Vercel can serve without invoking functions
export default function Page() {
  return <HomeClient />;
}

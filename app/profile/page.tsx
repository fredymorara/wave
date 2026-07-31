import { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Operator Profile | WAVE ANIME",
};

export default function ProfilePage() {
  return <ProfileClient />;
}

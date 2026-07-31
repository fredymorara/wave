import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import AdminDashboard from "@/app/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | WAVE ANIME",
};

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    redirect("/");
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
  
  if (!adminEmails.includes(session.user.email)) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-display-lg text-4xl uppercase tracking-tighter text-white">
            System <span className="text-neon-crimson">Admin</span>
          </h1>
          <p className="text-on-surface-variant font-label-caps mt-2 uppercase tracking-widest text-xs">
            Restricted Access
          </p>
        </div>
        
        <AdminDashboard />
      </div>
    </div>
  );
}

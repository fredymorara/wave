"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Eye, MessageSquare, Megaphone, Send, Clock, UserPlus, AlertCircle } from "lucide-react";
import { timeAgo } from "@/lib/timeAgo";

// Types
type TimeRange = "7d" | "30d" | "90d";

interface AdminStats {
  totalPageViews: number;
  uniqueVisitors: number;
  totalUsers: number;
  totalComments: number;
  dailyViews: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  topAnime: { animeId: string | null; title: string; views: number }[];
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const [range, setRange] = useState<TimeRange>("7d");
  const queryClient = useQueryClient();

  // Fetch Stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["adminStats", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch Broadcasts History
  const { data: broadcastsData, isLoading: broadcastsLoading } = useQuery<{ broadcasts: Broadcast[] }>({
    queryKey: ["adminBroadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/broadcasts");
      if (!res.ok) throw new Error("Failed to fetch broadcasts");
      return res.json();
    },
  });

  // Send Broadcast Mutation
  const [broadcastForm, setBroadcastForm] = useState({ title: "", message: "", linkUrl: "", linkLabel: "" });
  const [broadcastError, setBroadcastError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendBroadcast = useMutation({
    mutationFn: async (payload: typeof broadcastForm) => {
      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send broadcast");
      }
      return res.json();
    },
    onSuccess: () => {
      setBroadcastForm({ title: "", message: "", linkUrl: "", linkLabel: "" });
      queryClient.invalidateQueries({ queryKey: ["adminBroadcasts"] });
      setIsSending(false);
    },
    onError: (err) => {
      setBroadcastError(err.message);
      setIsSending(false);
    }
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    
    if (confirm("Are you sure you want to send this broadcast to all users?")) {
      setIsSending(true);
      setBroadcastError("");
      sendBroadcast.mutate(broadcastForm);
    }
  };

  // Helper for max value in charts
  const maxDailyViews = stats?.dailyViews?.length 
    ? Math.max(...stats.dailyViews.map(d => d.views)) 
    : 0;
  const maxPageViews = stats?.topPages?.[0]?.views || 0;
  const maxAnimeViews = stats?.topAnime?.[0]?.views || 0;

  return (
    <div className="flex flex-col gap-12">
      
      {/* Broadcast Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Send Broadcast Form */}
        <div className="bg-surface-container border border-outline-variant/30 p-6 clip-corner shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/20 pb-4">
            <Megaphone className="w-6 h-6 text-neon-crimson" />
            <h2 className="font-headline-lg text-xl uppercase tracking-wider text-on-surface drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">System Override</h2>
          </div>
          
          <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
            {broadcastError && (
              <div className="bg-neon-crimson/10 border border-neon-crimson text-neon-crimson p-3 flex gap-2 items-center font-label-caps text-xs">
                <AlertCircle className="w-4 h-4" />
                {broadcastError}
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="broadcastTitle" className="font-label-caps text-xs text-cyber-cyan uppercase before:content-['>_'] before:text-neon-crimson before:mr-2">Title <span className="text-neon-crimson">*</span></label>
              <input 
                id="broadcastTitle"
                type="text" 
                value={broadcastForm.title}
                onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})}
                required
                className="bg-void-black border border-outline-variant/30 p-3 text-cyber-cyan font-label-caps text-sm focus:outline-none focus:border-neon-crimson focus:shadow-[0_0_15px_rgba(255,0,60,0.2)] transition-all clip-chip"
                placeholder="SYSTEM.UPDATE.V2"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="broadcastMessage" className="font-label-caps text-xs text-cyber-cyan uppercase before:content-['>_'] before:text-neon-crimson before:mr-2">Message <span className="text-neon-crimson">*</span></label>
              <textarea 
                id="broadcastMessage"
                value={broadcastForm.message}
                onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})}
                required
                rows={4}
                className="bg-void-black border border-outline-variant/30 p-3 text-cyber-cyan font-label-caps text-sm focus:outline-none focus:border-neon-crimson focus:shadow-[0_0_15px_rgba(255,0,60,0.2)] transition-all clip-chip resize-none"
                placeholder="INITIALIZING_NEW_FEATURES..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="broadcastLinkUrl" className="font-label-caps text-xs text-cyber-cyan uppercase before:content-['>_'] before:text-neon-crimson before:mr-2">Link_URL</label>
                <input 
                  id="broadcastLinkUrl"
                  type="text" 
                  value={broadcastForm.linkUrl}
                  onChange={e => setBroadcastForm({...broadcastForm, linkUrl: e.target.value})}
                  className="bg-void-black border border-outline-variant/30 p-3 text-cyber-cyan font-label-caps text-sm focus:outline-none focus:border-neon-crimson focus:shadow-[0_0_15px_rgba(255,0,60,0.2)] transition-all clip-chip"
                  placeholder="/watch/123"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="broadcastLinkLabel" className="font-label-caps text-xs text-cyber-cyan uppercase before:content-['>_'] before:text-neon-crimson before:mr-2">Link_Label</label>
                <input 
                  id="broadcastLinkLabel"
                  type="text" 
                  value={broadcastForm.linkLabel}
                  onChange={e => setBroadcastForm({...broadcastForm, linkLabel: e.target.value})}
                  className="bg-void-black border border-outline-variant/30 p-3 text-cyber-cyan font-label-caps text-sm focus:outline-none focus:border-neon-crimson focus:shadow-[0_0_15px_rgba(255,0,60,0.2)] transition-all clip-chip"
                  placeholder="EXECUTE"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSending || !broadcastForm.title || !broadcastForm.message}
              className="mt-4 w-full border-2 border-neon-crimson bg-neon-crimson/10 text-neon-crimson font-label-caps text-sm uppercase tracking-widest p-4 hover:bg-neon-crimson hover:text-void-black hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all clip-corner flex items-center justify-center gap-3 group disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSending ? (
                <span className="animate-pulse flex items-center gap-2">
                  <span className="w-2 h-4 bg-current animate-pulse"></span> EXECUTING...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  [ EXECUTE_BROADCAST ]
                </>
              )}
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="bg-void-black border border-outline-variant/30 p-6 clip-corner shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden group">
          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-50 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.05)_2px,rgba(0,240,255,0.05)_4px)] z-0" />
          
          <div className="flex items-center gap-3 mb-6 border-b border-cyber-cyan/30 pb-4 relative z-10">
            <Clock className="w-6 h-6 text-cyber-cyan" />
            <h2 className="font-headline-lg text-xl uppercase tracking-wider text-cyber-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.2)]">System Log</h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-1 relative z-10">
            {broadcastsLoading ? (
              <div className="animate-pulse flex flex-col gap-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-cyber-cyan/10 border-l-2 border-cyber-cyan/30 w-full" />)}
              </div>
            ) : broadcastsData?.broadcasts.length === 0 ? (
              <p className="text-cyber-cyan/50 font-label-caps text-xs">No entries in system log.</p>
            ) : (
              broadcastsData?.broadcasts.map(b => (
                <div key={b.id} className="p-2 border-l-2 border-cyber-cyan/50 hover:border-cyber-cyan hover:bg-cyber-cyan/5 transition-all group/log">
                  <div className="flex justify-between items-start gap-4 mb-1">
                    <span className="font-label-caps text-xs text-cyber-cyan group-hover/log:text-white transition-colors truncate">
                      <span className="text-cyber-cyan/50 mr-2">[{b.id.slice(0, 6).toUpperCase()}]</span>
                      {b.title}
                    </span>
                    <span className="font-label-caps text-[10px] text-cyber-cyan/70 shrink-0">{timeAgo(b.createdAt)}</span>
                  </div>
                  <p className="font-label-caps text-[11px] text-on-surface-variant/80 line-clamp-2 pl-1">{b.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="font-headline-lg text-2xl uppercase tracking-wider text-white flex items-center gap-3">
            <Eye className="w-6 h-6 text-cyber-cyan" />
            Traffic Analytics
          </h2>
          
          <div className="flex bg-surface-container-high clip-chip p-1">
            {(["7d", "30d", "90d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 font-label-caps text-xs uppercase transition-colors clip-chip ${
                  range === r 
                    ? "bg-cyber-cyan text-void-black font-bold" 
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div className="animate-pulse h-64 bg-surface-container clip-corner border border-outline-variant/30 flex items-center justify-center">
            <span className="font-label-caps text-cyber-cyan">Loading data...</span>
          </div>
        ) : !stats ? (
          <div className="h-64 bg-surface-container clip-corner border border-outline-variant/30 flex items-center justify-center">
            <span className="font-label-caps text-neon-crimson">Error loading stats</span>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Page Views" value={stats.totalPageViews} icon={<Eye />} color="text-cyber-cyan" />
              <StatCard title="Unique Visitors" value={stats.uniqueVisitors} icon={<Users />} color="text-data-purple" />
              <StatCard title="Total Users" value={stats.totalUsers} icon={<UserPlus />} color="text-neon-crimson" />
              <StatCard title="Total Comments" value={stats.totalComments} icon={<MessageSquare />} color="text-white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Traffic Chart */}
              <div className="lg:col-span-2 bg-void-black border border-outline-variant/30 p-6 clip-corner shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col">
                <h3 className="font-headline-sm uppercase text-sm text-cyber-cyan mb-6 tracking-widest border-b border-cyber-cyan/30 pb-2 drop-shadow-[0_0_10px_rgba(0,240,255,0.2)]">Daily Page Views</h3>
                
                <div className="flex-1 min-h-64 relative flex items-end gap-1 p-2">
                  {/* Oscilloscope Grid Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-50 bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-size-[20px_20px] z-0" />
                  
                  {stats.dailyViews.map((day, i) => {
                    const heightPercent = maxDailyViews > 0 ? (day.views / maxDailyViews) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center group relative z-10 h-full">
                        <div 
                          className="w-full bg-linear-to-t from-cyber-cyan/10 via-cyber-cyan/40 to-cyber-cyan/80 group-hover:from-cyber-cyan/30 group-hover:to-cyber-cyan transition-all relative"
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        >
                          {/* Saturated Cap */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-cyan shadow-[0_0_10px_#00F0FF] group-hover:bg-white group-hover:shadow-[0_0_15px_#FFF] transition-colors" />
                        </div>
                        {/* Cyber Tooltip */}
                        <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col items-center z-50">
                          <div className="bg-void-black border border-cyber-cyan text-cyber-cyan px-3 py-2 text-xs font-label-caps whitespace-nowrap shadow-[0_0_15px_rgba(0,240,255,0.3)] clip-chip">
                            <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{new Date(day.date).toLocaleDateString()}</span>
                            <div className="h-px w-full bg-cyber-cyan/30 my-1" />
                            <span className="font-bold text-[14px] text-cyber-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">{day.views.toLocaleString()} views</span>
                            <br />
                            <span className="text-[10px] text-cyber-cyan/70">{day.visitors.toLocaleString()} unique</span>
                          </div>
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyber-cyan drop-shadow-[0_2px_5px_rgba(0,240,255,0.3)]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Lists */}
              <div className="flex flex-col gap-6">
                
                <div className="bg-void-black border border-outline-variant/30 p-5 clip-corner shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex-1 relative overflow-hidden group">
                  <h3 className="font-headline-sm uppercase text-xs text-cyber-cyan mb-4 tracking-widest border-b border-cyber-cyan/30 pb-2 drop-shadow-[0_0_10px_rgba(0,240,255,0.2)] relative z-10">Top Pages</h3>
                  <div className="flex flex-col gap-1 relative z-10">
                    {stats.topPages.map((page, i) => {
                      const wPercent = maxPageViews > 0 ? (page.views / maxPageViews) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm group/row relative p-2 overflow-hidden border border-transparent hover:border-cyber-cyan/30 transition-colors">
                          <div className="absolute left-0 top-0 bottom-0 bg-cyber-cyan/10 z-0 transition-all duration-500 ease-out group-hover/row:bg-cyber-cyan/20" style={{ width: `${Math.max(wPercent, 2)}%` }} />
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyber-cyan z-0" />
                          <span className="font-label-caps text-[10px] text-cyber-cyan/50 w-4 shrink-0 relative z-10 group-hover/row:text-cyber-cyan">{(i+1).toString().padStart(2, '0')}</span>
                          <span className="text-white truncate flex-1 font-body relative z-10 group-hover/row:text-cyber-cyan transition-colors" title={page.path}>
                            {page.path}
                          </span>
                          <span className="text-cyber-cyan font-label-caps shrink-0 relative z-10 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">{page.views.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-void-black border border-outline-variant/30 p-5 clip-corner shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex-1 relative overflow-hidden group">
                  <h3 className="font-headline-sm uppercase text-xs text-neon-crimson mb-4 tracking-widest border-b border-neon-crimson/30 pb-2 drop-shadow-[0_0_10px_rgba(255,0,60,0.2)] relative z-10">Top Anime</h3>
                  <div className="flex flex-col gap-1 relative z-10">
                    {stats.topAnime.map((anime, i) => {
                      const wPercent = maxAnimeViews > 0 ? (anime.views / maxAnimeViews) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm group/row relative p-2 overflow-hidden border border-transparent hover:border-neon-crimson/30 transition-colors">
                          <div className="absolute left-0 top-0 bottom-0 bg-neon-crimson/10 z-0 transition-all duration-500 ease-out group-hover/row:bg-neon-crimson/20" style={{ width: `${Math.max(wPercent, 2)}%` }} />
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neon-crimson z-0" />
                          <span className="font-label-caps text-[10px] text-neon-crimson/50 w-4 shrink-0 relative z-10 group-hover/row:text-neon-crimson">{(i+1).toString().padStart(2, '0')}</span>
                          <span className="text-white font-body truncate flex-1 relative z-10 group-hover/row:text-neon-crimson transition-colors" title={anime.title}>
                            {anime.title}
                          </span>
                          <span className="text-neon-crimson font-label-caps shrink-0 relative z-10 drop-shadow-[0_0_5px_rgba(255,0,60,0.5)]">{anime.views.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// Stat Card Helper
function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className={`bg-void-black border border-outline-variant/30 p-6 clip-corner relative overflow-hidden group transition-all duration-300 hover:border-current hover:shadow-[0_0_20px_currentColor] shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${color}`}>
      {/* Animated Glare */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform ease-in-out z-0" />
      
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 group-hover:opacity-20 transition-all duration-300 z-0 text-current">
        {icon}
      </div>
      
      <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mb-2 relative z-10 group-hover:text-white transition-colors">{title}</h3>
      <div className="font-headline-xl text-4xl font-bold relative z-10 drop-shadow-[0_0_15px_currentColor] text-current">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

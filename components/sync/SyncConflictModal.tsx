"use client";

import { useWatchStore } from "@/store/useWatchStore";
import Image from "next/image";
import { AlertTriangle, Monitor, Smartphone, ChevronRight } from "lucide-react";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function progressPercent(progress: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(Math.round((progress / duration) * 100), 100);
}

export function SyncConflictModal() {
  const pendingConflicts = useWatchStore((s) => s.pendingConflicts);
  const resolveConflict = useWatchStore((s) => s.resolveConflict);
  const resolveAllConflicts = useWatchStore((s) => s.resolveAllConflicts);

  if (pendingConflicts.length === 0) return null;

  const current = pendingConflicts[0];
  const remaining = pendingConflicts.length - 1;

  const localEp = Number(current.local.episode);
  const localTime = current.local.time || 0;
  const localDuration = current.local.duration || 0;
  const localPct = progressPercent(localTime, localDuration);

  const serverEp = current.server.episodeNumber;
  const serverTime = current.server.progressSeconds;
  const serverDuration = current.server.durationSeconds;
  const serverPct = progressPercent(serverTime, serverDuration);

  const displayTitle = current.local.title || current.server.title || `Anime ${current.animeId}`;
  const displayImage = current.local.image_url || current.server.imageUrl || "";

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-void-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)]" />

      <div className="relative w-[95vw] max-w-lg bg-surface-container-lowest border border-outline-variant/50 shadow-[0_0_40px_rgba(255,0,60,0.15)] overflow-hidden">
        {/* Header */}
        <div className="bg-neon-crimson/10 border-b border-neon-crimson/30 px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-neon-crimson shrink-0" />
          <div>
            <h2 className="font-headline-lg text-lg text-white uppercase tracking-wide">Conflicting Progress</h2>
            <p className="font-label-caps text-xs text-on-surface-variant mt-0.5">
              Select the watch history to keep. {remaining > 0 ? `(${remaining} more remaining)` : ""}
            </p>
          </div>
        </div>

        {/* Anime Context */}
        <div className="px-6 pt-5 pb-3 flex items-center gap-4">
          {displayImage && (
            <div className="relative w-14 h-20 shrink-0 border border-outline-variant/30 overflow-hidden">
              <Image src={displayImage} alt={displayTitle} fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-headline-md text-white text-sm leading-tight line-clamp-2">{displayTitle}</h3>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {/* Server State */}
          <button
            onClick={() => resolveConflict(current.animeId, "server")}
            className="group relative bg-surface-container border border-outline-variant/30 hover:border-cyber-cyan p-4 text-left transition-all duration-200 clip-corner"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyber-cyan" />
                <span className="font-label-caps text-xs text-cyber-cyan uppercase tracking-widest">Cloud</span>
              </div>
            </div>
            <div className="font-headline-lg text-xl text-white mb-1">EP {serverEp}</div>
            <div className="font-label-caps text-xs text-on-surface-variant">{formatTime(serverTime)} / {formatTime(serverDuration)}</div>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-outline-variant/30 overflow-hidden">
              <div className="h-full bg-cyber-cyan transition-all" style={{ width: `${serverPct}%` }} />
            </div>
            <div className="font-label-caps text-xs text-on-surface-variant mt-1 mb-4">{serverPct}% watched</div>
            
            {/* Action text */}
            <div className="font-label-caps text-xs text-cyber-cyan uppercase opacity-70 group-hover:opacity-100 transition-opacity">
              Keep this progress
            </div>
            {/* Hover CTA */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-cyber-cyan" />
            </div>
          </button>

          {/* Local State */}
          <button
            onClick={() => resolveConflict(current.animeId, "local")}
            className="group relative bg-surface-container border border-outline-variant/30 hover:border-neon-crimson p-4 text-left transition-all duration-200 clip-corner"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-neon-crimson" />
                <span className="font-label-caps text-xs text-neon-crimson uppercase tracking-widest">Local</span>
              </div>
            </div>
            <div className="font-headline-lg text-xl text-white mb-1">EP {localEp}</div>
            <div className="font-label-caps text-xs text-on-surface-variant">{formatTime(localTime)} / {formatTime(localDuration)}</div>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-outline-variant/30 overflow-hidden">
              <div className="h-full bg-neon-crimson transition-all" style={{ width: `${localPct}%` }} />
            </div>
            <div className="font-label-caps text-xs text-on-surface-variant mt-1 mb-4">{localPct}% watched</div>
            
            {/* Action text */}
            <div className="font-label-caps text-xs text-neon-crimson uppercase opacity-70 group-hover:opacity-100 transition-opacity">
              Keep this progress
            </div>
            {/* Hover CTA */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-neon-crimson" />
            </div>
          </button>
        </div>

        {/* Bulk Actions Footer */}
        {remaining > 0 && (
          <div className="px-6 py-3 border-t border-outline-variant/30 flex items-center justify-between gap-3 bg-surface-container-low">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase">Resolve all {pendingConflicts.length} conflicts:</span>
            <div className="flex gap-2">
              <button
                onClick={() => resolveAllConflicts("server")}
                className="font-label-caps text-xs px-3 py-1.5 border border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors clip-chip"
              >
                Use Cloud
              </button>
              <button
                onClick={() => resolveAllConflicts("local")}
                className="font-label-caps text-xs px-3 py-1.5 border border-neon-crimson/50 text-neon-crimson hover:bg-neon-crimson/10 transition-colors clip-chip"
              >
                Use Local
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

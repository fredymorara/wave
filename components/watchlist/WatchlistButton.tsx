"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Plus, Check, Loader2 } from "lucide-react";
import { useAuthModal } from "@/store/useAuthModal";

interface WatchlistButtonProps {
  animeId: string;
  className?: string;
  showText?: boolean;
}

export function WatchlistButton({ animeId, className = "px-6 py-4", showText = true }: WatchlistButtonProps) {
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      if (!session) {
        setLoading(false);
        setInList(false);
        return;
      }
      try {
        const res = await fetch('/api/watchlist');
        const data = await res.json();
        if (data.items) {
          setInList(data.items.some((item: { animeId: string }) => item.animeId === String(animeId)));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [session, animeId]);

  const toggleWatchlist = async () => {
    if (!session) {
      openModal('login');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId })
      });
      const data = await res.json();
      if (data.action === "added") setInList(true);
      if (data.action === "removed") setInList(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleWatchlist}
      disabled={loading}
      className={`flex items-center justify-center gap-2 bg-surface-container border border-outline-variant transition-all duration-300 group clip-corner font-label-caps font-bold ${
        inList ? 'text-cyber-cyan border-cyber-cyan hover:bg-cyber-cyan/10' : 'text-white hover:border-cyber-cyan hover:text-cyber-cyan'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : inList ? (
        <Check className="w-5 h-5" />
      ) : (
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
      )}
      {showText && (inList ? "IN LIST" : "MY LIST")}
    </button>
  );
}

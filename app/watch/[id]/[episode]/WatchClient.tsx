"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MessageSquare, Mic, FastForward, Server } from "lucide-react";
import { useAnimeDetails } from "@/hooks/useAnime";
import { Grid } from 'ldrs/react';
import 'ldrs/react/Grid.css';
import { useWatchStore } from "@/store/useWatchStore";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { CommentsSection } from "@/components/comments/CommentsSection";

import { useSearchParams, useRouter } from "next/navigation";

export default function WatchClient({ id, episode }: { id: string; episode: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initLang = searchParams.get("lang") === "dub" ? "dub" : "sub";
  
  const { data: anime, isLoading: isAnimeLoading } = useAnimeDetails(id);
  const addToHistory = useWatchStore((state) => state.addToHistory);

  const [language, setLanguage] = useState<"sub" | "dub">(initLang);
  const [autoNext, setAutoNext] = useState(true);
  const [provider, setProvider] = useState<"ani" | "mal">("ani");
  const playerRef = useRef<HTMLDivElement>(null);
  
  // Sub/Dub Availability State
  const [counts, setCounts] = useState<{ is_sub: number | null, is_dub: number | null } | null>(null);
  const [isCountsLoading, setIsCountsLoading] = useState(true);

  // Episode calculations & Dub Availability
  const epNum = parseInt(episode) || 1;
  const isDubAvailable = counts !== null && counts.is_dub !== null && counts.is_dub > 0 && counts.is_dub >= epNum;

  // Effective language: automatically guarantees "sub" is used if Dub is not available for this episode
  const effectiveLanguage = (language === "dub" && !isDubAvailable) ? "sub" : language;

  // Episode Pagination State
  const [episodeChunk, setEpisodeChunk] = useState(() => {
    return (!isNaN(epNum) && epNum > 0) ? Math.floor((epNum - 1) / 100) : 0;
  });

  const [prevEpisode, setPrevEpisode] = useState(episode);
  if (episode !== prevEpisode) {
    setPrevEpisode(episode);
    if (!isNaN(epNum) && epNum > 0) {
      setEpisodeChunk(Math.floor((epNum - 1) / 100));
    }
    if (counts && (counts.is_dub === null || counts.is_dub < epNum) && language === "dub") {
      setLanguage("sub");
    }
  }

  // Sub/Dub Availability State
  useEffect(() => {
    let isMounted = true;
    async function fetchCounts() {
      try {
        const res = await fetch(`/api/episodes/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data && (typeof data.is_sub === 'number' || typeof data.is_dub === 'number' || data.is_sub !== undefined)) {
              setCounts({ is_sub: data.is_sub ?? null, is_dub: data.is_dub ?? null });
              if (data.is_dub === null || data.is_dub === 0 || data.is_dub < epNum) {
                setLanguage("sub");
              }
            } else {
              setCounts(null);
            }
          }
        } else if (isMounted) {
          setCounts(null);
        }
      } catch (err) {
        console.error("Failed to fetch episode counts for player:", err);
        if (isMounted) {
          setCounts(null);
        }
      } finally {
        if (isMounted) {
          setIsCountsLoading(false);
        }
      }
    }
    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [id, epNum]);

  // Log watch history
  useEffect(() => {
    if (anime) {
      addToHistory({
        mal_id: id,
        title: anime.title.english || anime.title.romaji || "Anime",
        image_url: anime.coverImage.extraLarge || anime.coverImage.large,
        episode: episode,
        language: effectiveLanguage,
      });
    }
  }, [anime, episode, id, addToHistory, effectiveLanguage]);

  const updateProgress = useWatchStore((state) => state.updateProgress);

  // Fallback & Tracking Listener for MegaPlay
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      
      if (data?.event === "error") {
        console.warn("MegaPlay Error event received:", data);
        if (provider === "ani") {
          console.log("Falling back from Server 1 to Server 2...");
          setProvider("mal");
        }
      } else if (data?.event === "time") {
        // Log time progress to zustand
        if (data.time && data.duration) {
          updateProgress(id, data.time, data.duration);
        }
      } else if (data?.event === "complete") {
        // Auto Next Episode Logic
        if (autoNext) {
          window.dispatchEvent(new CustomEvent('megaplay-complete'));
        }
      }
    }
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [provider, id, updateProgress, autoNext]);

  // Episode count calculations: Only show actually released/aired episodes
  let baseEpisodes = 0;
  const isAiring = !!anime?.nextAiringEpisode;

  if (anime?.status === 'NOT_YET_RELEASED') {
    baseEpisodes = 0;
  } else if (anime?.nextAiringEpisode) {
    baseEpisodes = Math.max(0, anime.nextAiringEpisode.episode - 1);
  } else if (anime?.status === 'RELEASING') {
    // If releasing but schedule unknown, trust DB count or avoid assuming future unreleased episodes
    baseEpisodes = counts?.is_sub ?? 0;
  } else if (anime?.status === 'FINISHED') {
    baseEpisodes = anime.episodes || 0;
  } else {
    baseEpisodes = anime?.episodes || 0;
  }
  
  // Apply Sub/Dub limits from Anikoto DB
  let finalNumEpisodes = baseEpisodes;
  if (counts) {
    const limit = effectiveLanguage === "dub" ? counts.is_dub : counts.is_sub;
    if (limit !== null && limit !== undefined && limit > 0) {
      if (isAiring) {
        finalNumEpisodes = Math.min(baseEpisodes, limit);
      } else if (anime?.status === 'FINISHED' && anime.episodes) {
        finalNumEpisodes = Math.min(anime.episodes, limit);
      } else {
        finalNumEpisodes = limit;
      }
    } else if (effectiveLanguage === "dub") {
      finalNumEpisodes = 0;
    }
  }

  // Fallback only if we have active episode number
  if (finalNumEpisodes === 0 && epNum && anime?.status !== 'NOT_YET_RELEASED') {
    finalNumEpisodes = epNum;
  }

  // Handle auto next episode redirection
  useEffect(() => {
    function handleAutoNext() {
      const currentEpNum = parseInt(episode);
      const nextEpNum = currentEpNum + 1;
      
      if (!isNaN(currentEpNum) && nextEpNum <= finalNumEpisodes) {
        let targetLang = effectiveLanguage;
        if (effectiveLanguage === "dub" && counts?.is_dub !== null && counts?.is_dub !== undefined && counts.is_dub < nextEpNum) {
          targetLang = "sub";
        }
        router.push(`/watch/${id}/${nextEpNum}?lang=${targetLang}`);
      }
    }
    
    window.addEventListener('megaplay-complete', handleAutoNext);
    return () => window.removeEventListener('megaplay-complete', handleAutoNext);
  }, [episode, finalNumEpisodes, effectiveLanguage, counts, id, router]);


  if (isAnimeLoading || isCountsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-void-black">
        <Grid size="60" speed="1" color="#FF003C" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-void-black text-on-surface">
        <h1 className="font-headline-xl text-headline-xl">Anime not found</h1>
      </div>
    );
  }

  const titleStr = anime.title.english || anime.title.romaji;
  
  // Calculate iframe URL cleanly based on active provider and effective language
  const baseId = provider === "ani" ? (anime.id || id) : (anime.idMal || id);
  const iframeSrc = `https://megaplay.buzz/stream/${provider}/${baseId}/${episode}/${effectiveLanguage}?autoPlay=1`;

  const CHUNK_SIZE = 100;
  const numChunks = Math.ceil(finalNumEpisodes / CHUNK_SIZE);
  const startEp = episodeChunk * CHUNK_SIZE + 1;
  const endEp = Math.min((episodeChunk + 1) * CHUNK_SIZE, finalNumEpisodes);
  const currentEpisodes = Array.from({ length: Math.max(0, endEp - startEp + 1) }, (_, i) => startEp + i);

  return (
    <div className="flex-1 bg-void-black min-h-screen pb-20 pt-18">
      {/* Navigation Bar / Return */}
      <div className="w-full bg-void-black px-margin-mobile md:px-margin-desktop py-4 flex items-center gap-4">
        <Link href={`/anime/${id}`} className="text-on-surface-variant hover:text-cyber-cyan transition-colors flex items-center gap-2 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-label-caps text-[12px] uppercase tracking-widest">Back</span>
        </Link>
      </div>

      {/* Anime Info Context */}
      <div className="w-full max-w-[1600px] mx-auto px-margin-mobile md:px-margin-desktop mb-6">
        <div className="bg-surface-container/50 border border-outline-variant/30 clip-corner relative overflow-hidden group">
          {/* Faded Banner Background */}
          {(anime.bannerImage || anime.coverImage?.extraLarge) && (
            <div className="absolute inset-0 z-0">
              <Image 
                src={anime.bannerImage || anime.coverImage?.extraLarge || ""}
                alt="Banner"
                fill
                className="object-cover opacity-10 md:opacity-20 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-linear-to-r from-void-black via-void-black/80 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-void-black via-transparent to-transparent" />
            </div>
          )}
          
          <div className="p-6 flex flex-col md:flex-row gap-6 relative z-10">
            <div className="relative w-24 h-36 md:w-32 md:h-48 shrink-0 border border-outline-variant/30 shadow-[0_0_15px_rgba(255,0,60,0.2)]">
              <Image 
                src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                alt={titleStr || ""}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col flex-1 justify-center">
              <h1 className="font-headline-xl text-2xl md:text-3xl text-on-surface mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{titleStr}</h1>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-cyber-cyan font-bold font-headline-lg">{anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : "N/A"}</span>
                <span className="text-on-surface-variant font-label-caps text-[10px]">&bull;</span>
                <span className="text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider">{anime.seasonYear || 'N/A'}</span>
                <span className="text-on-surface-variant font-label-caps text-[10px]">&bull;</span>
                <span className="text-on-surface-variant font-label-caps text-[10px] uppercase tracking-wider">{anime.status?.replace('_', ' ')}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {anime.genres?.slice(0, 4).map(g => (
                  <span key={g} className="text-[10px] font-label-caps px-2 py-0.5 border border-outline-variant/30 text-on-surface-variant">{g}</span>
                ))}
              </div>
              <p 
                className="text-on-surface-variant/80 text-sm leading-relaxed line-clamp-3 md:line-clamp-4"
                dangerouslySetInnerHTML={{ __html: anime.description || 'No description available in databanks.' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      <section className="w-full bg-black relative">
        <div ref={playerRef} className="w-full max-w-[1600px] mx-auto aspect-video bg-surface-container flex items-center justify-center shadow-[0_0_30px_rgba(255,0,60,0.1)] relative">
          {/* Iframe key removes episode so it doesn't unmount on auto-next, allowing fullscreen preservation */}
          <iframe
            key={`${provider}-${effectiveLanguage}`}
            src={iframeSrc}
            allowFullScreen
            allow="autoplay; fullscreen"
            className="w-full h-full border-none absolute inset-0 z-10"
            title={`Watch ${titleStr} Episode ${episode}`}
          />
        </div>
      </section>

      {/* Server & Stream Fallback Helper Banner */}
      <div className="w-full max-w-[1600px] mx-auto px-margin-mobile md:px-margin-desktop py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-on-surface-variant font-label-caps bg-surface-container-lowest border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse"></span>
          <span>STREAM SOURCE: <strong className="text-white">{provider === "ani" ? "SERVER 1" : "SERVER 2"}</strong></span>
        </div>
        <button
          onClick={() => setProvider(prev => (prev === "ani" ? "mal" : "ani"))}
          className="text-cyber-cyan hover:text-white underline underline-offset-4 cursor-pointer transition-colors text-left sm:text-right"
        >
          Stream not playing or showing &apos;Content is not here&apos;? Switch to {provider === "ani" ? "Server 2" : "Server 1"} &rarr;
        </button>
      </div>

      {/* Player Controls Bar */}
      <div className="w-full max-w-[1600px] mx-auto bg-surface-container-lowest border-b border-surface-variant px-margin-mobile md:px-margin-desktop py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-label-caps text-cyber-cyan uppercase tracking-widest border border-cyber-cyan px-2 py-0.5 text-[10px] clip-corner bg-cyber-cyan/10">
              {anime.format || "TV"}
            </span>
            <span className="font-label-caps text-on-surface-variant text-[12px]">
              EPISODE {episode}
            </span>
          </div>
          <h1 className="font-headline-xl text-[24px] md:text-[28px] text-on-surface drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] line-clamp-1">
            {titleStr}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-surface-container px-4 py-2 clip-chip border border-outline-variant/30">
          {/* Sub / Dub Selector */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setLanguage("sub")}
              className={`flex items-center gap-1.5 font-label-caps text-[12px] px-3 py-1.5 transition-colors cursor-pointer ${effectiveLanguage === "sub" ? 'bg-neon-crimson text-void-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
            >
              <MessageSquare className="w-3 h-3" /> SUB
            </button>
            <button 
              onClick={() => {
                if (isDubAvailable) {
                  setLanguage("dub");
                }
              }}
              disabled={!isDubAvailable}
              className={`flex items-center gap-1.5 font-label-caps text-[12px] px-3 py-1.5 transition-colors ${
                effectiveLanguage === "dub" 
                  ? 'bg-cyber-cyan text-void-black font-bold' 
                  : 'text-on-surface-variant hover:text-white'
              } ${!isDubAvailable ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
              title={!isDubAvailable ? (counts?.is_dub ? `Dub only available up to Episode ${counts.is_dub}` : "Dub not available for this episode") : "Switch to DUB audio"}
            >
              <Mic className="w-3 h-3" /> DUB
            </button>
          </div>
          
          <div className="w-px h-6 bg-outline-variant/50 hidden sm:block"></div>

          {/* Cyberpunk Server Switcher */}
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 border border-outline-variant/30 clip-chip">
            <Server className="w-3 h-3 text-on-surface-variant mr-1" />
            <button 
              onClick={() => setProvider("ani")}
              className={`font-label-caps text-[11px] px-2.5 py-1 transition-all cursor-pointer ${
                provider === "ani" 
                  ? 'bg-cyber-cyan text-void-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.5)]' 
                  : 'text-on-surface-variant hover:text-cyber-cyan'
              }`}
              title="Stream Server 1"
            >
              SERVER 1
            </button>
            <button 
              onClick={() => setProvider("mal")}
              className={`font-label-caps text-[11px] px-2.5 py-1 transition-all cursor-pointer ${
                provider === "mal" 
                  ? 'bg-neon-crimson text-void-black font-bold shadow-[0_0_8px_rgba(255,0,60,0.5)]' 
                  : 'text-on-surface-variant hover:text-neon-crimson'
              }`}
              title="Stream Server 2"
            >
              SERVER 2
            </button>
          </div>
          
          <div className="w-px h-6 bg-outline-variant/50 hidden sm:block"></div>
          
          {/* Auto Next */}
          <button 
            onClick={() => setAutoNext(!autoNext)}
            className={`flex items-center gap-2 font-label-caps text-[12px] px-3 py-1.5 border rounded-full transition-colors cursor-pointer ${autoNext ? 'border-neon-crimson text-neon-crimson bg-neon-crimson/10' : 'border-outline-variant text-on-surface-variant hover:text-white hover:border-white'}`}
          >
            <FastForward className="w-3.5 h-3.5 shrink-0" /> 
            <span>AUTO NEXT</span>
          </button>
          
          <div className="w-px h-6 bg-outline-variant/50"></div>
          
          <WatchlistButton animeId={id} className="px-3 py-1.5 bg-transparent border-none hover:bg-surface-glass text-xs cursor-pointer" showText={false} />
        </div>
      </div>

      {/* Content Layout */}
      <div className="w-full max-w-[1600px] mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Column: Context & Episodes */}
        <div className="lg:col-span-8 flex flex-col gap-stack-lg">

          {/* Episode Selector */}
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
              <h2 className="font-headline-xl text-headline-xl text-on-surface">EPISODES <span className="text-neon-crimson font-label-caps text-[12px] align-top">{finalNumEpisodes}</span></h2>
            </div>
            
            {/* Episode Pagination */}
            {numChunks > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from({ length: numChunks }).map((_, i) => {
                  const s = i * CHUNK_SIZE + 1;
                  const e = Math.min((i + 1) * CHUNK_SIZE, finalNumEpisodes);
                  return (
                    <button
                      key={i}
                      onClick={() => setEpisodeChunk(i)}
                      className={`font-label-caps text-[12px] px-4 py-2 border clip-chip transition-all ${
                        episodeChunk === i 
                          ? 'bg-neon-crimson border-neon-crimson text-void-black font-bold' 
                          : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-cyber-cyan hover:text-cyber-cyan'
                      }`}
                    >
                      EP {s} - {e}
                    </button>
                  );
                })}
              </div>
            )}
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
              {currentEpisodes.length > 0 ? (
                currentEpisodes.map((epNum) => {
                  const isCurrent = epNum.toString() === episode;
                  
                  // Predictively switch to sub for next episodes if dub isn't out yet
                  const targetLang = (effectiveLanguage === "dub" && counts && (counts.is_dub === null || counts.is_dub === 0 || epNum > counts.is_dub)) ? "sub" : effectiveLanguage;
                  
                  return (
                    <Link key={epNum} href={`/watch/${id}/${epNum}?lang=${targetLang}`}>
                      <div className={`flex items-center justify-center p-3 font-headline-lg transition-colors clip-chip text-center cursor-pointer border ${
                        isCurrent 
                        ? 'bg-cyber-cyan text-void-black border-cyber-cyan' 
                        : 'bg-surface-container hover:bg-neon-crimson hover:text-void-black text-on-surface border-outline-variant hover:border-neon-crimson'
                      }`}>
                        {epNum}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-full text-on-surface-variant py-8">No episodes found.</div>
              )}
            </div>
          </div>
          
          <CommentsSection animeId={id} episodeNumber={episode} />
        </div>

        {/* Right Column: Recommendations */}
        <div className="lg:col-span-4 flex flex-col gap-stack-lg mt-8 lg:mt-0">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <h2 className="font-headline-xl text-[20px] text-on-surface">MORE LIKE THIS</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {anime.recommendations?.slice(0, 8).map((rec) => (
              <Link key={rec.idMal || ""} href={`/anime/${rec.idMal || ""}`} className="relative aspect-3/4 bg-surface-container overflow-hidden group border border-outline-variant/30 hover:border-cyber-cyan transition-all block clip-corner">
                <Image 
                  src={rec.coverImage?.extraLarge || rec.coverImage?.large || ""} 
                  alt={rec.title?.english || rec.title?.romaji || ""} 
                  fill 
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 z-0"
                />
                <div className="absolute inset-0 bg-linear-to-t from-void-black via-void-black/20 to-transparent z-0" />
                <div className="absolute top-2 right-2 bg-void-black/80 text-neon-crimson font-label-caps text-[10px] px-2 py-1 border border-neon-crimson/50 clip-chip z-10">
                  {rec.averageScore ? (rec.averageScore / 10).toFixed(1) : "N/A"}
                </div>
                <div className="absolute bottom-0 left-0 w-full p-3 z-10">
                  <h3 className="font-headline-lg text-[14px] text-white leading-tight line-clamp-2 group-hover:text-cyber-cyan transition-colors">
                    {rec.title?.english || rec.title?.romaji}
                  </h3>
                  <span className="font-label-caps text-[10px] text-on-surface-variant mt-1 inline-block">
                    {rec.format || 'TV'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

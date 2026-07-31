"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, MessageSquare, Mic, FastForward } from "lucide-react";
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
  
  // Episode Pagination State
  const [episodeChunk, setEpisodeChunk] = useState(() => {
    const epNum = parseInt(episode);
    return (!isNaN(epNum) && epNum > 0) ? Math.floor((epNum - 1) / 100) : 0;
  });

  const [prevEpisode, setPrevEpisode] = useState(episode);
  if (episode !== prevEpisode) {
    setPrevEpisode(episode);
    const epNum = parseInt(episode);
    if (!isNaN(epNum) && epNum > 0) {
      setEpisodeChunk(Math.floor((epNum - 1) / 100));
    }
  }

  // Sub/Dub Availability State
  const [counts, setCounts] = useState<{ is_sub: number | null, is_dub: number | null } | null>(null);

  // Fetch Anikoto Sub/Dub counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch(`/api/episodes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCounts(data);
        }
      } catch (err) {
        console.error("Failed to fetch episode counts", err);
      }
    }
    if (anime) fetchCounts();
  }, [anime, id]);

  // Auto-switch to sub if dub is not available for the current episode
  useEffect(() => {
    if (counts && language === "dub") {
      const epNumInt = parseInt(episode);
      if (counts.is_dub !== null && counts.is_dub !== undefined && epNumInt > counts.is_dub) {
        const timer = setTimeout(() => setLanguage("sub"), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [counts, episode, language]);

  useEffect(() => {
    if (anime && episode) {
      addToHistory({
        mal_id: id,
        title: anime.title.english || anime.title.romaji || "",
        image_url: anime.coverImage.extraLarge,
        episode: episode,
        language: language,
      });
    }
  }, [anime, episode, id, addToHistory, language]);

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
        console.warn("MegaPlay Error:", data);
        if (provider === "ani") {
          console.log("Falling back from AniList ID to MAL ID...");
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
          // Calculate max episodes we know of based on counts
          // Since this runs inside an effect, we will use a custom event or trigger a state change, 
          // or just emit a custom signal to let the component handle navigation.
          // Wait, we can't easily access the latest `episode` string without adding it to dependencies.
          // We'll dispatch a custom event on the window to cleanly handle the redirect
          window.dispatchEvent(new CustomEvent('megaplay-complete'));
        }
      }
    }
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [provider, id, updateProgress, autoNext]);

  // Episode calculations
  let baseEpisodes = anime?.episodes || 0;
  const isAiring = !!anime?.nextAiringEpisode;

  if (anime?.nextAiringEpisode) {
    baseEpisodes = anime.nextAiringEpisode.episode - 1;
  } else if (anime?.status === 'NOT_YET_RELEASED') {
    baseEpisodes = 0;
  } else if (!baseEpisodes) {
    baseEpisodes = parseInt(episode) || 12;
  }
  
  // Apply Sub/Dub limits if available from Anikoto
  let finalNumEpisodes = baseEpisodes;
  if (counts && anime) {
    const limit = language === "dub" ? counts.is_dub : counts.is_sub;
    if (limit !== null && limit !== undefined) {
      if (isAiring) {
        finalNumEpisodes = Math.min(baseEpisodes, limit);
      } else if (anime.episodes) {
        finalNumEpisodes = Math.min(anime.episodes, limit);
      } else {
        // Trust Anikoto fully if AniList has no episode count
        finalNumEpisodes = Math.max(limit, parseInt(episode) || 0);
      }
    }
  }

  // Handle auto-next custom event
  useEffect(() => {
    function handleAutoNext() {
      const epNumInt = parseInt(episode);
      const nextEpNum = epNumInt + 1;
      
      if (nextEpNum <= finalNumEpisodes) {
        // Transfer fullscreen to our wrapper before navigating
        if (document.fullscreenElement && playerRef.current) {
          playerRef.current.requestFullscreen().catch(e => console.error("Fullscreen transfer failed", e));
        }

        // Predictively switch to sub if next episode doesn't have dub
        const targetLang = (language === "dub" && counts && counts.is_dub !== null && nextEpNum > counts.is_dub) ? "sub" : language;
        router.push(`/watch/${id}/${nextEpNum}?lang=${targetLang}`);
      }
    }
    
    window.addEventListener('megaplay-complete', handleAutoNext);
    return () => window.removeEventListener('megaplay-complete', handleAutoNext);
  }, [episode, finalNumEpisodes, language, counts, id, router]);


  if (isAnimeLoading) {
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
  
  // Calculate iframe URL
  const baseId = provider === "ani" ? anime.id : id; // anime.id is AniList ID, id is MAL ID
  const iframeSrc = `https://megaplay.buzz/stream/${provider}/${baseId}/${episode}/${language}?autoPlay=1`;

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
            key={`${provider}-${language}`}
            src={iframeSrc}
            allowFullScreen
            allow="autoplay; fullscreen"
            className="w-full h-full border-none absolute inset-0 z-10"
            title={`Watch ${titleStr} Episode ${episode}`}
          />
        </div>
      </section>

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

        <div className="flex items-center gap-4 bg-surface-container px-4 py-2 clip-chip border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLanguage("sub")}
              className={`flex items-center gap-1.5 font-label-caps text-[12px] px-3 py-1.5 transition-colors ${language === "sub" ? 'bg-neon-crimson text-void-black font-bold' : 'text-on-surface-variant hover:text-white'}`}
            >
              <MessageSquare className="w-3 h-3" /> SUB
            </button>
            <button 
              onClick={() => setLanguage("dub")}
              disabled={counts !== null && (counts.is_dub === null || counts.is_dub < parseInt(episode))}
              className={`flex items-center gap-1.5 font-label-caps text-[12px] px-3 py-1.5 transition-colors ${language === "dub" ? 'bg-cyber-cyan text-void-black font-bold' : 'text-on-surface-variant hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={counts !== null && (counts.is_dub === null || counts.is_dub < parseInt(episode)) ? "Dub not available for this episode" : ""}
            >
              <Mic className="w-3 h-3" /> DUB
            </button>
          </div>
          
          <div className="w-px h-6 bg-outline-variant/50"></div>
          
          <button 
            onClick={() => setAutoNext(!autoNext)}
            className={`flex items-center gap-2 font-label-caps text-[12px] px-4 py-1.5 border rounded-full transition-colors ${autoNext ? 'border-neon-crimson text-neon-crimson bg-neon-crimson/10' : 'border-outline-variant text-on-surface-variant hover:text-white hover:border-white'}`}
          >
            <FastForward className="w-4 h-4 shrink-0" /> 
            <span>AUTO NEXT</span>
          </button>
          
          <div className="w-px h-6 bg-outline-variant/50"></div>
          
          <WatchlistButton animeId={id} className="px-3 py-1.5 bg-transparent border-none hover:bg-surface-glass text-xs" showText={false} />
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
                  const targetLang = (language === "dub" && counts && counts.is_dub !== null && epNum > counts.is_dub) ? "sub" : language;
                  
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

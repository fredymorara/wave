"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { useState, useEffect } from "react";
import { useExploreAnime } from "@/hooks/useAnime";
import { Grid } from 'ldrs/react';
import 'ldrs/react/Grid.css';

export default function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [filters, setFilters] = useState({
    genre: searchParams.get("genre") || "Any",
    year: Number(searchParams.get("year")) || 0,
    format: searchParams.get("format") || "Any",
    score: Number(searchParams.get("score")) || 0,
    status: searchParams.get("status") || "Any",
    sort: searchParams.get("sort") || (query ? "SEARCH_MATCH" : "TRENDING_DESC")
  });

  useEffect(() => {
    const syncFilters = async () => {
      setFilters({
        genre: searchParams.get("genre") || "Any",
        year: Number(searchParams.get("year")) || 0,
        format: searchParams.get("format") || "Any",
        score: Number(searchParams.get("score")) || 0,
        status: searchParams.get("status") || "Any",
        sort: searchParams.get("sort") || (query ? "SEARCH_MATCH" : "TRENDING_DESC")
      });
    };
    syncFilters();
  }, [searchParams, query]);
  
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useExploreAnime(query, filters);
  const results = data?.pages.flatMap((page) => page.media) || [];

  return (
    <div className="flex-1 min-h-screen pt-30 px-margin-mobile md:px-margin-desktop bg-void-black pb-12">
      <div className="mb-stack-lg border-b border-outline-variant/20 pb-4">
        <h1 className="font-headline-xl text-3xl text-on-surface">
          {query ? (
            <>Search Results for <span className="text-cyber-cyan">&quot;{query}&quot;</span></>
          ) : (
            <>Browse <span className="text-cyber-cyan">Anime Catalog</span></>
          )}
        </h1>
        <p className="text-on-surface-variant mt-2 font-label-caps text-sm">
          {results?.length || 0} Matches Found
        </p>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-4 mb-stack-lg">
        <select 
          value={filters.genre} 
          onChange={(e) => setFilters({...filters, genre: e.target.value})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value="Any">Any Genre</option>
          <option value="Action">Action</option>
          <option value="Adventure">Adventure</option>
          <option value="Comedy">Comedy</option>
          <option value="Drama">Drama</option>
          <option value="Ecchi">Ecchi</option>
          <option value="Fantasy">Fantasy</option>
          <option value="Horror">Horror</option>
          <option value="Mahou Shoujo">Mahou Shoujo</option>
          <option value="Mecha">Mecha</option>
          <option value="Music">Music</option>
          <option value="Mystery">Mystery</option>
          <option value="Psychological">Psychological</option>
          <option value="Romance">Romance</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Slice of Life">Slice of Life</option>
          <option value="Sports">Sports</option>
          <option value="Supernatural">Supernatural</option>
          <option value="Thriller">Thriller</option>
        </select>

        <select 
          value={filters.year} 
          onChange={(e) => setFilters({...filters, year: Number(e.target.value)})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value={0}>Any Year</option>
          {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select 
          value={filters.format} 
          onChange={(e) => setFilters({...filters, format: e.target.value})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value="Any">Any Format</option>
          <option value="TV">TV Series</option>
          <option value="MOVIE">Movie</option>
          <option value="OVA">OVA</option>
          <option value="SPECIAL">Special</option>
        </select>

        <select 
          value={filters.score} 
          onChange={(e) => setFilters({...filters, score: Number(e.target.value)})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value={0}>Any Rating</option>
          <option value={90}>Masterpiece (90+)</option>
          <option value={80}>Great (80+)</option>
          <option value={70}>Good (70+)</option>
          <option value={60}>Average (60+)</option>
        </select>

        <select 
          value={filters.status} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value="Any">Any Status</option>
          <option value="RELEASING">Airing</option>
          <option value="FINISHED">Finished</option>
          <option value="NOT_YET_RELEASED">Upcoming</option>
        </select>
        
        <select 
          value={filters.sort} 
          onChange={(e) => setFilters({...filters, sort: e.target.value})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors md:ml-auto"
        >
          <option value="SEARCH_MATCH">Sort: Best Match</option>
          <option value="TRENDING_DESC">Sort: Trending</option>
          <option value="POPULARITY_DESC">Sort: Most Popular</option>
          <option value="SCORE_DESC">Sort: Highest Rated</option>
          <option value="UPDATED_AT_DESC">Sort: Recently Updated</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Grid size="60" speed="1" color="#00F0FF" />
          <p className="text-on-surface font-label-caps uppercase tracking-widest mt-4">Searching...</p>
        </div>
      ) : !results || results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">👾</div>
          <h2 className="font-headline-xl text-on-surface-variant text-xl">NO DATA FOUND</h2>
          <p className="text-on-surface-variant/60 mt-2">Try adjusting your search parameters.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter">
            {results.map((anime) => (
              <Link key={anime.idMal} href={`/anime/${anime.idMal}`} className="relative aspect-3/4 bg-surface-container overflow-hidden group border border-outline-variant/30 hover:border-neon-crimson hover:shadow-[0_0_15px_rgba(255,0,60,0.2)] transition-all block clip-corner">
                <Image 
                  src={anime.coverImage.extraLarge || anime.coverImage.large} 
                  alt={anime.title.english || anime.title.romaji || ""} 
                  fill 
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 z-0"
                />
                <div className="absolute inset-0 bg-linear-to-t from-void-black via-void-black/20 to-transparent z-0" />
                <div className="absolute top-2 right-2 bg-void-black/80 text-neon-crimson font-label-caps text-[10px] px-2 py-1 border border-neon-crimson/50 clip-chip z-10">
                  {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A"}
                </div>
                <div className="absolute bottom-0 left-0 w-full p-4 z-10">
                  <h3 className="font-headline-lg text-[16px] text-white leading-tight line-clamp-2 group-hover:text-neon-crimson transition-colors">
                    {anime.title.english || anime.title.romaji}
                  </h3>
                  <span className="font-label-caps text-[10px] text-on-surface-variant mt-1 inline-block">
                    {anime.format || 'TV'} &bull; {anime.seasonYear || 'N/A'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          
          {hasNextPage && (
            <div className="mt-12 flex justify-center">
              <button 
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-surface-glass border border-neon-crimson text-neon-crimson hover:bg-neon-crimson hover:text-void-black px-12 py-4 font-label-caps font-bold transition-all clip-corner shadow-[0_0_15px_rgba(255,0,60,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-2">
                    <Grid size="20" speed="1" color="currentColor" /> LOADING...
                  </span>
                ) : (
                  "LOAD MORE ANIME"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

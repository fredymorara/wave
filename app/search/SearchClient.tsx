"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { useState, useEffect } from "react";
import { useSearchAnime } from "@/hooks/useAnime";
import { Grid } from 'ldrs/react';
import 'ldrs/react/Grid.css';

export default function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [filters, setFilters] = useState({
    genre: searchParams.get("genre") || "Any",
    year: Number(searchParams.get("year")) || 0,
    format: searchParams.get("format") || "Any",
    sort: searchParams.get("sort") || "SEARCH_MATCH"
  });

  useEffect(() => {
    const syncFilters = async () => {
      setFilters({
        genre: searchParams.get("genre") || "Any",
        year: Number(searchParams.get("year")) || 0,
        format: searchParams.get("format") || "Any",
        sort: searchParams.get("sort") || "SEARCH_MATCH"
      });
    };
    syncFilters();
  }, [searchParams]);
  
  const { data: results, isLoading } = useSearchAnime(query, filters);

  return (
    <div className="flex-1 min-h-screen pt-30 px-margin-mobile md:px-margin-desktop bg-void-black pb-12">
      <div className="mb-stack-lg border-b border-outline-variant/20 pb-4">
        <h1 className="font-headline-xl text-3xl text-on-surface">
          {query ? (
            <>Search Results for <span className="text-cyber-cyan">&quot;{query}&quot;</span></>
          ) : (
            <>Browse <span className="text-cyber-cyan">Anime Databanks</span></>
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
          <option value="Fantasy">Fantasy</option>
          <option value="Romance">Romance</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Thriller">Thriller</option>
          <option value="Mystery">Mystery</option>
        </select>

        <select 
          value={filters.year} 
          onChange={(e) => setFilters({...filters, year: Number(e.target.value)})}
          className="bg-surface-container text-on-surface border border-outline-variant p-3 font-label-caps text-[12px] clip-chip outline-none focus:border-neon-crimson hover:border-cyber-cyan transition-colors"
        >
          <option value={0}>Any Year</option>
          <option value={2024}>2024</option>
          <option value={2023}>2023</option>
          <option value={2022}>2022</option>
          <option value={2021}>2021</option>
          <option value={2020}>2020</option>
          <option value={2019}>2019</option>
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
          <p className="text-on-surface font-label-caps uppercase tracking-widest mt-4">Searching Databanks...</p>
        </div>
      ) : !results || results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">👾</div>
          <h2 className="font-headline-xl text-on-surface-variant text-xl">NO DATA FOUND</h2>
          <p className="text-on-surface-variant/60 mt-2">Try adjusting your search parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter">
          {results.map((anime) => (
            <Link key={anime.idMal} href={`/anime/${anime.idMal}`} className="relative aspect-3/4 bg-surface-container overflow-hidden group border border-outline-variant/30 hover:border-cyber-cyan transition-all block clip-corner">
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
                <h3 className="font-headline-lg text-[16px] text-white leading-tight line-clamp-2 group-hover:text-cyber-cyan transition-colors">
                  {anime.title.english || anime.title.romaji}
                </h3>
                <span className="font-label-caps text-[10px] text-on-surface-variant mt-1 inline-block">
                  {anime.format || 'TV'} &bull; {anime.seasonYear || 'N/A'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import React from "react";

const TOP_GENRES = [
  "All",
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

interface QuickGenreBarProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function QuickGenreBar({ selectedGenre, onSelectGenre }: QuickGenreBarProps) {
  return (
    <div className="w-full overflow-x-auto pb-2 mb-stack-md">
      <div className="flex items-center gap-2 min-w-max">
        <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mr-1 select-none">
          Quick Genre:
        </span>
        {TOP_GENRES.map((genre) => {
          const isSelected =
            (genre === "All" && (!selectedGenre || selectedGenre === "Any")) ||
            (genre !== "All" && selectedGenre.toLowerCase() === genre.toLowerCase());

          return (
            <button
              key={genre}
              type="button"
              onClick={() => onSelectGenre(genre === "All" ? "Any" : genre)}
              className={`px-3 py-2 font-label-caps text-xs transition-all clip-chip min-h-11 cursor-pointer select-none ${
                isSelected
                  ? "bg-neon-crimson text-void-black font-bold shadow-[0_0_12px_rgba(255,0,60,0.5)] border border-neon-crimson"
                  : "bg-surface-container text-on-surface-variant border border-outline-variant/30 hover:border-cyber-cyan hover:text-on-surface"
              }`}
            >
              {genre.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

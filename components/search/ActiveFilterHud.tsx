import React from "react";
import { X, RotateCcw } from "lucide-react";

export interface CatalogFilters {
  genre: string;
  year: number;
  format: string;
  score: number;
  status: string;
  sort: string;
}

interface ActiveFilterHudProps {
  filters: CatalogFilters;
  query: string;
  onRemoveFilter: (key: keyof CatalogFilters) => void;
  onClearQuery: () => void;
  onResetAll: () => void;
}

export function ActiveFilterHud({
  filters,
  query,
  onRemoveFilter,
  onClearQuery,
  onResetAll,
}: ActiveFilterHudProps) {
  const activePills: { label: string; onRemove: () => void }[] = [];

  if (query.trim()) {
    activePills.push({
      label: `SEARCH: "${query.trim()}"`,
      onRemove: onClearQuery,
    });
  }

  if (filters.genre && filters.genre !== "Any") {
    activePills.push({
      label: `GENRE: ${filters.genre}`,
      onRemove: () => onRemoveFilter("genre"),
    });
  }

  if (filters.year > 0) {
    activePills.push({
      label: `YEAR: ${filters.year}`,
      onRemove: () => onRemoveFilter("year"),
    });
  }

  if (filters.format && filters.format !== "Any") {
    activePills.push({
      label: `FORMAT: ${filters.format}`,
      onRemove: () => onRemoveFilter("format"),
    });
  }

  if (filters.score > 0) {
    activePills.push({
      label: `SCORE: ${filters.score}+`,
      onRemove: () => onRemoveFilter("score"),
    });
  }

  if (filters.status && filters.status !== "Any") {
    activePills.push({
      label: `STATUS: ${filters.status}`,
      onRemove: () => onRemoveFilter("status"),
    });
  }

  if (activePills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-stack-lg p-3 bg-surface-container/50 border border-outline-variant/30 clip-chip">
      <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider mr-1 select-none">
        Active Filters:
      </span>

      {activePills.map((pill, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-cyber-cyan/40 text-cyber-cyan font-label-caps text-xs clip-chip"
        >
          <span>{pill.label}</span>
          <button
            type="button"
            onClick={pill.onRemove}
            className="hover:text-neon-crimson transition-colors cursor-pointer p-1 -mr-1"
            aria-label={`Remove filter ${pill.label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetAll}
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-neon-crimson border border-neon-crimson/50 hover:bg-neon-crimson hover:text-void-black font-label-caps text-xs font-bold transition-all clip-chip cursor-pointer min-h-11"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        RESET ALL
      </button>
    </div>
  );
}

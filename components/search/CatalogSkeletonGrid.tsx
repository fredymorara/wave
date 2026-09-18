import React from "react";

interface CatalogSkeletonGridProps {
  count?: number;
}

export function CatalogSkeletonGrid({ count = 10 }: CatalogSkeletonGridProps) {
  return (
    <div 
      data-testid="catalog-skeleton-grid"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="relative aspect-3/4 bg-surface-container/60 border border-outline-variant/30 clip-corner overflow-hidden animate-pulse"
        >
          {/* Top-right cyber badge skeleton */}
          <div className="absolute top-2 right-2 w-10 h-5 bg-outline-variant/20 clip-chip" />

          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 bg-linear-to-t from-void-black via-surface-container/20 to-transparent" />

          {/* Bottom metadata skeleton */}
          <div className="absolute bottom-0 left-0 w-full p-4 space-y-2 z-10">
            <div className="h-4 bg-outline-variant/30 w-5/6 clip-chip" />
            <div className="h-3 bg-outline-variant/20 w-1/2 clip-chip" />
          </div>
        </div>
      ))}
    </div>
  );
}

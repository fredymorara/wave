import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchHistoryItem {
  mal_id: string | number;
  title: string;
  image_url: string;
  episode: string | number;
  timestamp: number;        // local timestamp (Date.now())
  time?: number;            // playback position in seconds (float)
  duration?: number;        // total duration in seconds (float)
  language?: "sub" | "dub";
  dirty?: boolean;          // needs syncing to server
  lastSyncedAt?: number;    // last time this entry was synced to server
}

export interface SyncConflict {
  animeId: string;
  local: WatchHistoryItem;
  server: {
    episodeNumber: number;
    progressSeconds: number;
    durationSeconds: number;
    title: string | null;
    imageUrl: string | null;
    language: string;
    updatedAt: string;
  };
}

interface WatchStoreState {
  history: Record<string, WatchHistoryItem>;
  pendingConflicts: SyncConflict[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp' | 'dirty'>) => void;
  updateProgress: (mal_id: string | number, time: number, duration: number) => void;
  removeFromHistory: (mal_id: string | number) => void;
  clearHistory: () => void;
  markDirty: (mal_id: string | number) => void;
  markSynced: (mal_id: string | number) => void;
  getDirtyEntries: () => WatchHistoryItem[];
  mergeFromServer: (serverItems: ServerWatchItem[]) => void;
  resolveConflict: (animeId: string, choice: "server" | "local") => void;
  resolveAllConflicts: (choice: "server" | "local") => void;
  clearConflicts: () => void;
}

export interface ServerWatchItem {
  id: string;
  userId: string;
  animeId: string;
  episodeNumber: number;
  progressSeconds: number;
  durationSeconds: number;
  title: string | null;
  imageUrl: string | null;
  language: string;
  updatedAt: string;
}

const CONFLICT_EPISODE_THRESHOLD = 0;   // any episode difference = conflict
const CONFLICT_PROGRESS_THRESHOLD = 60; // >60s progress difference = conflict

export const useWatchStore = create<WatchStoreState>()(
  persist(
    (set, get) => ({
      history: {},
      pendingConflicts: [],

      addToHistory: (item) =>
        set((state) => ({
          history: {
            ...state.history,
            [item.mal_id]: {
              ...state.history[item.mal_id], // preserve existing time/duration
              ...item,
              timestamp: Date.now(),
              dirty: true,
            },
          },
        })),

      updateProgress: (mal_id, time, duration) =>
        set((state) => {
          if (!state.history[mal_id]) return state;
          return {
            history: {
              ...state.history,
              [mal_id]: {
                ...state.history[mal_id],
                time,
                duration,
                dirty: true,
              },
            },
          };
        }),

      removeFromHistory: (mal_id) =>
        set((state) => {
          const newHistory = { ...state.history };
          delete newHistory[mal_id];
          return { history: newHistory };
        }),

      clearHistory: () => set({ history: {} }),

      markDirty: (mal_id) =>
        set((state) => {
          if (!state.history[mal_id]) return state;
          return {
            history: {
              ...state.history,
              [mal_id]: { ...state.history[mal_id], dirty: true },
            },
          };
        }),

      markSynced: (mal_id) =>
        set((state) => {
          if (!state.history[mal_id]) return state;
          return {
            history: {
              ...state.history,
              [mal_id]: {
                ...state.history[mal_id],
                dirty: false,
                lastSyncedAt: Date.now(),
              },
            },
          };
        }),

      getDirtyEntries: () => {
        const { history } = get();
        return Object.values(history).filter((item) => item.dirty);
      },

      mergeFromServer: (serverItems) =>
        set((state) => {
          const newHistory = { ...state.history };
          const conflicts: SyncConflict[] = [];

          // Create a set of server IDs to detect deletions
          const serverIds = new Set(serverItems.map((s) => s.animeId));

          for (const serverItem of serverItems) {
            const localItem = newHistory[serverItem.animeId];

            if (!localItem) {
              // No local entry — accept server data directly
              newHistory[serverItem.animeId] = {
                mal_id: serverItem.animeId,
                title: serverItem.title || "",
                image_url: serverItem.imageUrl || "",
                episode: serverItem.episodeNumber,
                timestamp: new Date(serverItem.updatedAt).getTime(),
                time: serverItem.progressSeconds,
                duration: serverItem.durationSeconds,
                language: (serverItem.language as "sub" | "dub") || "sub",
                dirty: false,
                lastSyncedAt: Date.now(),
              };
              continue;
            }

            // Local entry exists — check for conflicts
            const localEp = Number(localItem.episode);
            const serverEp = serverItem.episodeNumber;
            const localProgress = localItem.time || 0;
            const serverProgress = serverItem.progressSeconds;
            const episodeDiff = Math.abs(localEp - serverEp);
            const progressDiff = Math.abs(localProgress - serverProgress);

            const hasConflict =
              episodeDiff > CONFLICT_EPISODE_THRESHOLD ||
              (episodeDiff === 0 && progressDiff > CONFLICT_PROGRESS_THRESHOLD);

            if (hasConflict && localItem.dirty) {
              // Significant difference + local has unsaved changes → ask user
              conflicts.push({
                animeId: serverItem.animeId,
                local: localItem,
                server: {
                  episodeNumber: serverItem.episodeNumber,
                  progressSeconds: serverItem.progressSeconds,
                  durationSeconds: serverItem.durationSeconds,
                  title: serverItem.title,
                  imageUrl: serverItem.imageUrl,
                  language: serverItem.language,
                  updatedAt: serverItem.updatedAt,
                },
              });
            } else if (!localItem.dirty) {
              // Local is clean (already synced) — take server silently
              newHistory[serverItem.animeId] = {
                ...localItem,
                episode: serverItem.episodeNumber,
                time: serverItem.progressSeconds,
                duration: serverItem.durationSeconds,
                title: serverItem.title || localItem.title,
                image_url: serverItem.imageUrl || localItem.image_url,
                language: (serverItem.language as "sub" | "dub") || localItem.language,
                timestamp: new Date(serverItem.updatedAt).getTime(),
                dirty: false,
                lastSyncedAt: Date.now(),
              };
            }
            // If local is dirty but no conflict, keep local (it will sync up on next push)
          }

          // Handle remote deletions:
          // If a local item exists, is NOT dirty, was previously synced, but is missing from the server array,
          // it must have been deleted remotely. We should delete it locally.
          for (const localId of Object.keys(newHistory)) {
            const item = newHistory[localId];
            if (!serverIds.has(localId) && !item.dirty && item.lastSyncedAt !== undefined) {
              delete newHistory[localId];
            }
          }

          return {
            history: newHistory,
            pendingConflicts: conflicts,
          };
        }),

      resolveConflict: (animeId, choice) =>
        set((state) => {
          const conflict = state.pendingConflicts.find((c) => c.animeId === animeId);
          if (!conflict) return state;

          const newHistory = { ...state.history };

          if (choice === "server") {
            newHistory[animeId] = {
              mal_id: animeId,
              title: conflict.server.title || conflict.local.title,
              image_url: conflict.server.imageUrl || conflict.local.image_url,
              episode: conflict.server.episodeNumber,
              timestamp: new Date(conflict.server.updatedAt).getTime(),
              time: conflict.server.progressSeconds,
              duration: conflict.server.durationSeconds,
              language: (conflict.server.language as "sub" | "dub") || "sub",
              dirty: false,
              lastSyncedAt: Date.now(),
            };
          } else {
            // Keep local — mark dirty so it syncs up
            newHistory[animeId] = {
              ...conflict.local,
              dirty: true,
            };
          }

          return {
            history: newHistory,
            pendingConflicts: state.pendingConflicts.filter((c) => c.animeId !== animeId),
          };
        }),

      resolveAllConflicts: (choice) =>
        set((state) => {
          const newHistory = { ...state.history };

          for (const conflict of state.pendingConflicts) {
            if (choice === "server") {
              newHistory[conflict.animeId] = {
                mal_id: conflict.animeId,
                title: conflict.server.title || conflict.local.title,
                image_url: conflict.server.imageUrl || conflict.local.image_url,
                episode: conflict.server.episodeNumber,
                timestamp: new Date(conflict.server.updatedAt).getTime(),
                time: conflict.server.progressSeconds,
                duration: conflict.server.durationSeconds,
                language: (conflict.server.language as "sub" | "dub") || "sub",
                dirty: false,
                lastSyncedAt: Date.now(),
              };
            } else {
              newHistory[conflict.animeId] = {
                ...conflict.local,
                dirty: true,
              };
            }
          }

          return {
            history: newHistory,
            pendingConflicts: [],
          };
        }),

      clearConflicts: () => set({ pendingConflicts: [] }),
    }),
    {
      name: 'wave-anime-storage',
    }
  )
);

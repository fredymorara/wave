"use client";

import { useProgressSync } from "@/hooks/useProgressSync";
import { SyncConflictModal } from "@/components/sync/SyncConflictModal";

/**
 * ProgressSyncProvider — mounts the background sync hook
 * and the conflict resolution modal at the app root level.
 * Must be rendered inside QueryProvider (for session access).
 */
export function ProgressSyncProvider() {
  useProgressSync();
  return <SyncConflictModal />;
}

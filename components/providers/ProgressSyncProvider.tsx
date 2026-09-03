"use client";

import { useProgressSync } from "@/hooks/useProgressSync";

/**
 * ProgressSyncProvider — mounts the background sync hook at the app root level.
 * Handles silent background synchronization using Netflix-style auto-determination.
 * Must be rendered inside QueryProvider (for session access).
 */
export function ProgressSyncProvider() {
  useProgressSync();
  return null;
}

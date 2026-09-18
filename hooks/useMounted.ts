import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hydration-safe mount hook using React's useSyncExternalStore.
 * Returns false on the server / initial hydration, and true once mounted on the client.
 * Avoids cascading render ESLint warnings caused by calling setState in useEffect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

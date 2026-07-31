import { Suspense } from "react";
import SearchClient from "./SearchClient";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-void-black">
          <Loader2 className="w-12 h-12 text-cyber-cyan animate-spin" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}

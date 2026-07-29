import { Loader2 } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

export function AuthSplashSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-app-dark">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-40 flex items-center px-4 gap-3">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="w-24 h-4" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col fixed top-0 left-0 h-full w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800 gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="w-20 h-4" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="hidden md:flex justify-end items-center p-4 pb-0">
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

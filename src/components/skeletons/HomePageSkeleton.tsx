import { Skeleton } from '@/components/ui/skeleton';

export default function HomePageSkeleton() {
  return (
    <div className="space-y-8 py-6">
      {/* Hero */}
      <div className="container mx-auto px-4 space-y-4">
        <Skeleton className="h-10 w-2/3 mx-auto" />
        <Skeleton className="h-5 w-1/2 mx-auto" />
        <Skeleton className="h-12 w-full max-w-lg mx-auto rounded-lg" />
      </div>

      {/* Category chips */}
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Listing grid */}
      <div className="container mx-auto px-4">
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

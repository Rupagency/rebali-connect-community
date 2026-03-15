import { Skeleton } from '@/components/ui/skeleton';

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

export function MessageBubblesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Incoming */}
      <div className="flex gap-2 max-w-[70%]">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-16 w-48 rounded-lg rounded-tl-none" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      {/* Outgoing */}
      <div className="flex gap-2 max-w-[70%] ml-auto flex-row-reverse">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-1 items-end flex flex-col">
          <Skeleton className="h-10 w-36 rounded-lg rounded-tr-none" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      {/* Incoming */}
      <div className="flex gap-2 max-w-[70%]">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-12 w-56 rounded-lg rounded-tl-none" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

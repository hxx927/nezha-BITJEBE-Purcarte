import { Skeleton } from "@/components/ui/skeleton"

export function ServerDetailChartLoading() {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-[182px] w-full animate-none rounded-lg bg-muted-foreground/10" />
      ))}
    </section>
  )
}

export function ServerDetailLoading() {
  return (
    <div className="w-full rounded-lg border bg-card p-4 shadow-lg sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 animate-none rounded-md bg-muted-foreground/10" />
          <Skeleton className="h-7 w-36 animate-none rounded-md bg-muted-foreground/10" />
        </div>
        <Skeleton className="h-6 w-16 animate-none rounded-md bg-muted-foreground/10" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16 animate-none rounded bg-muted-foreground/10" />
            <Skeleton className="h-5 w-full max-w-48 animate-none rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

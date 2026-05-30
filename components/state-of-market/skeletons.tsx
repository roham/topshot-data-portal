// Suspense fallbacks for the State of the Market surface. Match layout so a
// window/index/tier change shows shimmer in place — no layout shift.

function Box({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[13px] bg-[var(--surface-2)] ${className}`} />;
}

export function HeroSkeleton() {
  return (
    <div className="py-[30px]">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Box className="h-3 w-32" />
          <Box className="h-14 w-48" />
          <Box className="h-4 w-40" />
          <Box className="h-8 w-64" />
        </div>
        <Box className="h-[250px] w-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-[14px] md:grid-cols-3">
        <Box className="h-[78px]" />
        <Box className="h-[78px]" />
        <Box className="h-[78px]" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[92px] flex-1 animate-pulse rounded-lg bg-[var(--surface-2)]"
          style={{ flexBasis: `${110 + ((i * 37) % 120)}px` }}
        />
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="mt-[14px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.5fr_1fr]">
      <Box className="h-[420px]" />
      <div className="flex flex-col gap-[14px]">
        <Box className="h-[200px]" />
        <Box className="h-[200px]" />
      </div>
    </div>
  );
}

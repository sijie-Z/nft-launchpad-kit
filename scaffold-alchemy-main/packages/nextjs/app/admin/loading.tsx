export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      {/* Dashboard skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-base-content/5 bg-base-200/30 p-4">
            <div className="h-3 w-20 bg-base-300 rounded animate-pulse mb-2" />
            <div className="h-6 w-28 bg-base-300 rounded animate-pulse mb-1" />
            <div className="h-2 w-16 bg-base-300 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:w-64 shrink-0">
          <div className="h-6 w-32 bg-base-300 rounded animate-pulse mb-4" />
          <div className="rounded-2xl bg-base-200/40 border border-base-content/5 p-4 mb-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-16 bg-base-300 rounded animate-pulse" />
                <div className="h-3 w-12 bg-base-300 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-10 w-full bg-base-300/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <div className="h-8 w-48 bg-base-300 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-base-300 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-base-content/5 bg-base-100 p-5">
                <div className="h-4 w-20 bg-base-300 rounded animate-pulse mb-3" />
                <div className="h-8 w-24 bg-base-300 rounded animate-pulse mb-3" />
                <div className="h-9 w-full bg-base-300 rounded-btn animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-base-content/5 bg-base-100 p-5">
            <div className="h-5 w-32 bg-base-300 rounded animate-pulse mb-4" />
            <div className="h-10 w-full bg-base-300 rounded-btn animate-pulse mb-3" />
            <div className="h-10 w-24 bg-base-300 rounded-btn animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

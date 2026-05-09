"use client";

/**
 * 铸造页面加载骨架屏
 * 在合约数据加载时显示，避免白屏
 */
export function MintSkeleton() {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero skeleton */}
      <div className="hero min-h-[50vh]">
        <div className="hero-content text-center max-w-2xl w-full px-4">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Progress ring skeleton */}
            <div className="w-40 h-40 rounded-full bg-base-300 animate-pulse" />

            {/* Title skeleton */}
            <div className="h-8 w-64 bg-base-300 rounded animate-pulse" />
            <div className="h-4 w-48 bg-base-300 rounded animate-pulse" />

            {/* Stats skeleton */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-6 w-16 bg-base-300 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-base-300 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Mode tabs skeleton */}
            <div className="flex gap-2 flex-wrap justify-center">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-28 bg-base-300 rounded-btn animate-pulse" />
              ))}
            </div>

            {/* Input + Button skeleton */}
            <div className="flex gap-3 w-full max-w-xs">
              <div className="h-12 flex-1 bg-base-300 rounded-btn animate-pulse" />
              <div className="h-12 w-32 bg-base-300 rounded-btn animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 通用内容加载骨架
 */
export function ContentSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-base-300 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

/**
 * 卡片加载骨架
 */
export function CardSkeleton() {
  return (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body gap-4">
        <div className="h-6 w-40 bg-base-300 rounded animate-pulse" />
        <div className="h-4 w-full bg-base-300 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-base-300 rounded animate-pulse" />
        <div className="h-10 w-full bg-base-300 rounded-btn animate-pulse" />
      </div>
    </div>
  );
}

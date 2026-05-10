export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="h-9 w-72 bg-[var(--color-bg-soft)] rounded-lg mb-2" />
          <div className="h-3 w-64 bg-[var(--color-bg-soft)] rounded" />
        </div>
        <div className="h-10 w-32 bg-[var(--color-bg-soft)] rounded-2xl" />
      </div>

      {/* Hero strip — 4 tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>

      {/* Client tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

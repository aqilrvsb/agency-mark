export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-soft)]" />
        <div className="flex-1">
          <div className="h-9 w-72 bg-[var(--color-bg-soft)] rounded-lg mb-2" />
          <div className="h-3 w-48 bg-[var(--color-bg-soft)] rounded" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex gap-2 -mb-px">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-9 w-24 bg-[var(--color-bg-soft)] rounded-t-lg" />
          ))}
        </div>
      </div>

      {/* Hero strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-56 bg-[var(--color-bg-soft)] rounded-2xl mb-6" />

      {/* Table placeholder */}
      <div className="h-64 bg-[var(--color-bg-soft)] rounded-2xl" />
    </div>
  );
}

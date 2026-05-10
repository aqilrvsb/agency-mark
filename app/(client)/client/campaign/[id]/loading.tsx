export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-3 w-32 bg-[var(--color-bg-soft)] rounded mb-3" />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex gap-1.5 mb-2">
            <div className="h-4 w-20 bg-[var(--color-bg-soft)] rounded-md" />
          </div>
          <div className="h-9 w-96 max-w-full bg-[var(--color-bg-soft)] rounded-lg mb-2" />
          <div className="h-3 w-64 bg-[var(--color-bg-soft)] rounded" />
        </div>
        <div className="h-10 w-48 bg-[var(--color-bg-soft)] rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>

      <div className="h-56 bg-[var(--color-bg-soft)] rounded-2xl mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-[var(--color-bg-soft)] rounded-2xl" />
        <div className="h-64 bg-[var(--color-bg-soft)] rounded-2xl" />
      </div>
    </div>
  );
}

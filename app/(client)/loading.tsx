export default function Loading() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-10 w-64 bg-[var(--color-bg-soft)] rounded-lg mb-3" />
      <div className="h-4 w-96 bg-[var(--color-bg-soft)] rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-[var(--color-bg-soft)] rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-[var(--color-bg-soft)] rounded-2xl" />
    </div>
  );
}

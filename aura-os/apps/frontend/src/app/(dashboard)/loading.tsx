export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome skeleton */}
      <div className="gradient-aura rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-white/20 rounded-lg w-64 mb-2" />
        <div className="h-4 bg-white/10 rounded-lg w-48" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-8 bg-gray-100 rounded-lg w-8 mb-3" />
            <div className="h-6 bg-gray-100 rounded-lg w-24 mb-1" />
            <div className="h-4 bg-gray-100 rounded-lg w-20" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="h-5 bg-gray-100 rounded-lg w-32 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="h-5 bg-gray-100 rounded-lg w-24 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';

export function Loading({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-violet`} />
      {text && <span className="text-gray-400 text-sm">{text}</span>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loading size="lg" text="Loading application..." />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glassmorphism rounded-xl p-4 animate-pulse">
      <div className="h-32 bg-white/10 rounded-lg mb-3"></div>
      <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-white/10 rounded w-1/2"></div>
    </div>
  );
}



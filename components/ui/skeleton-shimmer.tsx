'use client';

import { cn } from '@/lib/utils';

interface SkeletonShimmerProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'button';
}

export function SkeletonShimmer({ className, variant = 'card' }: SkeletonShimmerProps) {
  const baseClasses = "relative overflow-hidden bg-slate-100/80";
  
  const variantClasses = {
    card: "rounded-xl h-32",
    text: "rounded-lg h-4",
    circle: "rounded-full w-12 h-12",
    button: "rounded-xl h-10"
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {/* Shimmer gradient overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
    </div>
  );
}

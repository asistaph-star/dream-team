import React from 'react';

export interface SkewedBadgeProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function SkewedBadge({
  children,
  className,
  innerClassName
}: SkewedBadgeProps) {
  return (
    <div className={className}>
      <div className={`absolute inset-0 bg-zinc-950/95 skew-x-[-12deg] z-0 pointer-events-none ${innerClassName}`} />
      {children}
    </div>
  );
}

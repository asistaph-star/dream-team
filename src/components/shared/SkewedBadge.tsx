import React from 'react';

export interface SkewedBadgeProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
}

export function SkewedBadge({
  children,
  className,
  innerClassName,
  style
}: SkewedBadgeProps) {
  return (
    <div className={className} style={style}>
      <div className={`absolute inset-0 bg-zinc-950/95 skew-x-[-12deg] z-0 pointer-events-none ${innerClassName}`} />
      {children}
    </div>
  );
}

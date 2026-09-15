import type { ElementType, ReactNode } from "react";

/**
 * Filled 12px corner marks inherit currentColor from their container.
 */
const CORNERS = ["tl", "tr", "br", "bl"] as const;

export function CornerFrame({ as: Tag = "div", className = "", children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={`corner-frame ${className}`.trim()}>
    {CORNERS.map(pos => <svg key={pos} className={`corner corner-${pos}`} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3.13043 0L12 0L12 3.13043L5.63043 3.13043C4.24972 3.13043 3.13043 4.24972 3.13043 5.63043L3.13043 12L0 12L0 3.13043L0 0L3.13043 0Z" fill="currentColor" />
    </svg>)}
    {children}
  </Tag>;
}

"use client";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

/**
 * Marca tipográfica del panel (wordmark, sin logotipo corporativo de GM).
 */
export function ChevroletLogo({
  className,
  width = 240,
  height = 56,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-col items-center justify-center gap-0.5 overflow-hidden leading-none",
        "animate-logo-gold-pulse rounded-lg px-1 py-0.5",
        className,
      )}
      style={{ width, minHeight: height }}
    >
      <span
        className="bg-clip-text text-center [font-size:clamp(1.15rem,4.2vw,1.65rem)] font-black tracking-[0.18em] text-transparent [background-image:linear-gradient(105deg,#e8c96b_0%,#f5e6a8_40%,#c9a227_100%)]"
      >
        CHEVROLET
      </span>
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.45em] text-cyan-400/85">
        Dashboard
      </span>
    </span>
  );
}

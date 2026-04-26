"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Archivo en `inventario/public/Chevrolet-Logo.png` */
const CHEVROLET_LOGO_SRC = "/Chevrolet-Logo.png";

type Props = {
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
};

/**
 * Logo gráfico (pulso dorado: `animate-logo-gold-pulse` en `globals.css`).
 */
export function ChevroletMarkImage({
  className,
  width,
  height,
  priority = false,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center bg-transparent",
        className,
      )}
    >
      <Image
        src={CHEVROLET_LOGO_SRC}
        alt="Chevrolet"
        width={width}
        height={height}
        className="animate-logo-gold-pulse h-auto max-h-full w-auto max-w-full object-contain object-center [background:transparent]"
        priority={priority}
        draggable={false}
      />
    </span>
  );
}

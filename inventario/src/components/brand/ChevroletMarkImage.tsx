"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Archivo en `inventario/public/GMC-logo.png` */
const BRAND_LOGO_SRC = "/GMC-logo.png";

type Props = {
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
};

/**
 * Logo GMC: capa de aura (misma figura difuminada) + borde pulsante — ver `globals.css`.
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
        "relative inline-flex max-w-full items-center justify-center overflow-visible bg-transparent",
        className,
      )}
    >
      <Image
        src={BRAND_LOGO_SRC}
        alt="GMC"
        width={width}
        height={height}
        className="relative z-[1] h-auto max-h-full w-auto max-w-full object-contain object-center [background:transparent] animate-logo-red-edge"
        priority={priority}
        draggable={false}
      />
      <span
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-visible"
        aria-hidden
      >
        <Image
          src={BRAND_LOGO_SRC}
          alt=""
          width={width}
          height={height}
          className="h-full w-full max-h-full max-w-full object-contain object-center [background:transparent] animate-logo-red-aura"
          draggable={false}
        />
      </span>
    </span>
  );
}

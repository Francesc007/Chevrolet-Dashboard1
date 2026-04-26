import { normalizeInventoryPublicUrl } from "@/lib/storage-inventory";
import type { ReviewRow } from "@/types";

/**
 * Fila API: `year` unificado, `model` sin sufijo " · AAAA" si el año está en columna.
 */
export function normalizeReviewRow(row: ReviewRow): ReviewRow {
  const r = row as ReviewRow & { year?: number | null };
  let year =
    r.year != null && !Number.isNaN(Number(r.year))
      ? Math.round(Number(r.year))
      : r.vehicle_year != null && !Number.isNaN(Number(r.vehicle_year))
        ? Math.round(Number(r.vehicle_year))
        : null;

  let yOk = year != null && year >= 1900 && year <= 2100 ? year : null;
  let model = (row.model ?? row.vehicle_model ?? "").trim() || null;

  // Legacy: "Modelo · 2024" sin columnas de año rellenadas
  if (yOk == null && model?.includes("·")) {
    const parts = model.split(/\s*·\s*/).filter(Boolean);
    const last = parts[parts.length - 1]!;
    if (/^\d{4}$/.test(last)) {
      const y = Number(last);
      if (y >= 1900 && y <= 2100) {
        yOk = y;
        model = parts.slice(0, -1).join(" · ").trim() || null;
      }
    }
  } else if (model && yOk != null) {
    const stripped = model
      .replace(new RegExp(`\\s*·\\s*${yOk}\\s*$`), "")
      .trim();
    if (stripped) model = stripped;
  }

  return {
    ...row,
    year: yOk,
    vehicle_year: yOk,
    model,
    vehicle_model: model,
    photo_url: normalizeInventoryPublicUrl(row.photo_url),
  };
}

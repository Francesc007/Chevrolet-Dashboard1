/**
 * Unifica modelo + año para persistir: `model` solo nombre, `year` numérico.
 * Acepta payloads con vehicle_model/vehicle_year o texto legacy "Nombre · 2024".
 */
export function resolveReviewVehicleFields(input: {
  model?: string | null;
  vehicle_model?: string | null;
  year?: number | null;
  vehicle_year?: number | null;
}): { model: string | null; year: number | null } {
  let yearVal: number | null =
    input.year !== undefined && input.year !== null
      ? input.year
      : input.vehicle_year !== undefined && input.vehicle_year !== null
        ? input.vehicle_year
        : null;

  let raw =
    (input.vehicle_model?.trim() || input.model?.trim() || "") || "";

  if (yearVal == null && raw.includes("·")) {
    const parts = raw.split(/\s*·\s*/).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]!;
      if (/^\d{4}$/.test(last)) {
        const y = Number(last);
        if (y >= 1900 && y <= 2100) {
          yearVal = y;
          raw = parts.slice(0, -1).join(" · ").trim();
        }
      }
    }
  }

  if (yearVal != null && raw) {
    raw = raw
      .replace(new RegExp(`\\s*·\\s*${yearVal}\\s*$`), "")
      .trim();
  }

  if (/^\d{4}$/.test(raw) && yearVal == null) {
    const y = Number(raw);
    if (y >= 1900 && y <= 2100) {
      return { model: null, year: y };
    }
  }

  return { model: raw || null, year: yearVal };
}

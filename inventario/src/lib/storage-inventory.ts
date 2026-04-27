/**
 * Bucket público de Supabase Storage para imágenes de inventario / reseñas.
 * Debe coincidir con `storage.buckets` en las migraciones SQL.
 */
export const STORAGE_BUCKET = "inventory";

/**
 * Corrige URLs antiguas que apuntaban al bucket `cars` para que usen `inventory`.
 */
export function normalizeInventoryPublicUrl(
  url: string | null | undefined,
): string | null {
  if (url == null || url === "") return null;
  if (!url.includes("/object/public/cars/")) return url;
  return url.replace(
    /\/object\/public\/cars\//g,
    `/object/public/${STORAGE_BUCKET}/`,
  );
}

/**
 * Limpia `gallery_urls` desde Postgres (nulls en el array, strings vacíos, tipos raros).
 */
export function sanitizeGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    const n = normalizeInventoryPublicUrl(t);
    if (n != null && n !== "") out.push(n);
  }
  return out;
}

export function normalizeCarImageUrls<T extends { cover_image_url: string | null; gallery_urls: string[] }>(
  car: T,
): T {
  return {
    ...car,
    cover_image_url: normalizeInventoryPublicUrl(car.cover_image_url),
    gallery_urls: sanitizeGalleryUrls(car.gallery_urls),
  };
}

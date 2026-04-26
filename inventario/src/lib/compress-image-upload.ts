import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 1;
const MAX_WIDTH_OR_HEIGHT_PX = 1200;

/**
 * Reduce peso (≤1 MB) y tamaño (lado mayor ≤1200 px) manteniendo buena calidad.
 * Los GIF se suben sin comprimir para no perder animación.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return file;
  }

  const out = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT_PX,
    useWebWorker: true,
    initialQuality: 0.85,
    alwaysKeepResolution: false,
    /** Evita File con type vacío en algunos navegadores (el servidor rechazaría la subida). */
    fileType: file.type && /^image\//i.test(file.type) ? file.type : "image/jpeg",
  });

  const mime =
    out.type && /^image\/(jpeg|png|webp|gif)$/i.test(out.type)
      ? out.type
      : file.type && /^image\/(jpeg|png|webp|gif)$/i.test(file.type)
        ? file.type
        : "image/jpeg";

  if (out.type === mime) return out;

  const base = (out.name || file.name || "upload").replace(/\.[^.]+$/, "");
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return new File([await out.arrayBuffer()], `${base}.${ext}`, {
    type: mime,
    lastModified: out.lastModified || file.lastModified,
  });
}

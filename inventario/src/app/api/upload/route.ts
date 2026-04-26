import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/require-auth";
import { STORAGE_BUCKET } from "@/lib/storage-inventory";
import { randomUUID } from "crypto";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isBucketMissing(err: { message?: string } | null): boolean {
  const m = err?.message ?? "";
  return /bucket not found|bucket .* does not exist|no such bucket/i.test(m);
}

/** Crea el bucket público si el proyecto aún no tiene las migraciones SQL aplicadas. */
async function ensureInventoryBucket(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    return { ok: false, message: listErr.message };
  }
  const exists = buckets?.some(
    (b) => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET,
  );
  if (exists) return { ok: true };

  const { error: createErr } = await supabase.storage.createBucket(
    STORAGE_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    },
  );
  if (createErr) {
    return { ok: false, message: createErr.message };
  }
  return { ok: true };
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Falta el campo file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Archivo demasiado grande (máx. 8 MB)" },
      { status: 413 },
    );
  }

  let type = (file.type || "").toLowerCase();
  if (!ALLOWED.has(type)) {
    const name = (file.name || "").toLowerCase();
    const ext = name.match(/\.([a-z0-9]+)$/)?.[1];
    const fromName =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "gif"
              ? "image/gif"
              : null;
    if (fromName && ALLOWED.has(fromName)) {
      type = fromName;
    }
  }

  if (!ALLOWED.has(type)) {
    return NextResponse.json(
      {
        error:
          "Tipo no permitido (usa JPEG, PNG, WebP o GIF). Si es HEIC, convierte la foto o prueba desde otro dispositivo.",
      },
      { status: 415 },
    );
  }

  const ext =
    type === "image/jpeg"
      ? "jpg"
      : type === "image/png"
        ? "png"
        : type === "image/webp"
          ? "webp"
          : "gif";

  const path = `uploads/${randomUUID()}.${ext}`;

  try {
    const supabase = createAdminClient();
    const buf = Buffer.from(await file.arrayBuffer());

    let error = (
      await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
        contentType: type,
        upsert: false,
      })
    ).error;

    if (error && isBucketMissing(error)) {
      const ensured = await ensureInventoryBucket(supabase);
      if (!ensured.ok) {
        console.error("ensureInventoryBucket:", ensured.message);
        return NextResponse.json(
          {
            error: "El bucket de imágenes no existe y no se pudo crear automáticamente.",
            detail:
              process.env.NODE_ENV === "development"
                ? ensured.message
                : undefined,
            hint: `En Supabase: Storage → New bucket → id «${STORAGE_BUCKET}», público. O ejecuta el SQL de supabase/migrations/001_initial.sql (sección storage.buckets).`,
          },
          { status: 500 },
        );
      }
      error = (
        await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
          contentType: type,
          upsert: false,
        })
      ).error;
    }

    if (error) {
      console.error(error);
      const msg = error.message ?? "";
      const badKey = /jws|jwt|invalid api key|apikey/i.test(msg);
      const missingBucket = isBucketMissing(error);
      return NextResponse.json(
        {
          error: "No se pudo subir al almacenamiento",
          detail: process.env.NODE_ENV === "development" ? msg : undefined,
          ...(badKey && {
            hint: "La clave de Supabase parece inválida. Revisa SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local y reinicia el servidor.",
          }),
          ...(missingBucket && {
            hint: `Crea el bucket «${STORAGE_BUCKET}» en Supabase Storage (público) o aplica las migraciones SQL del proyecto.`,
          }),
        },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl, path });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    const badKey = /jws|jwt|invalid api key/i.test(msg);
    return NextResponse.json(
      {
        error: "Error al subir",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
        ...(badKey && {
          hint: "Revisa las variables de Supabase en .env.local (service_role + URL del mismo proyecto).",
        }),
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/require-auth";
import { normalizeReviewRow } from "@/lib/reviews-normalize";
import { resolveReviewVehicleFields } from "@/lib/reviews-vehicle";
import type { ReviewRow } from "@/types";

function legacyModelLine(
  vehicle_model: string | null | undefined,
  vehicle_year: number | null | undefined,
): string | null {
  const parts: string[] = [];
  const m = vehicle_model?.trim();
  if (m) parts.push(m);
  if (vehicle_year != null && Number.isFinite(vehicle_year)) {
    parts.push(String(Math.round(vehicle_year)));
  }
  return parts.length ? parts.join(" · ") : null;
}

function isMissingExtendedReviewColumns(err: { message?: string; code?: string } | null) {
  const msg = (err?.message ?? "").toLowerCase();
  return (
    msg.includes("vehicle_model") ||
    msg.includes("vehicle_year") ||
    msg.includes("year") ||
    msg.includes("schema cache") ||
    err?.code === "PGRST204"
  );
}

const optionalUrl = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalYear = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}, z.number().int().min(1900).max(2100).nullable().optional());

const patchSchema = z
  .object({
    car_id: z.union([z.string().uuid(), z.null()]).optional(),
    name: z.string().min(1).optional(),
    location: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    vehicle_model: z.string().optional().nullable(),
    year: optionalYear,
    vehicle_year: optionalYear,
    photo_url: optionalUrl,
    comment: z.string().min(1).optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

function omitUndefined(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
}

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const supabase = createAdminClient();
    /** Solo columnas del esquema actual en Supabase (`model`, `year`). Las columnas
     * `vehicle_model` / `vehicle_year` son opcionales (migración 007); no listarlas aquí
     * para no fallar si no existen. */
    const { data: existing, error: existErr } = await supabase
      .from("reviews")
      .select("id, model, year")
      .eq("id", id)
      .maybeSingle();

    if (existErr) {
      console.error(existErr);
      return NextResponse.json({ error: existErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const patch = parsed.data;
    const ex = existing as ReviewRow | null;
    const vehicleKeys = [
      "model",
      "vehicle_model",
      "year",
      "vehicle_year",
    ] as const;
    const touchesVehicle = vehicleKeys.some(
      (k) => (patch as Record<string, unknown>)[k] !== undefined,
    );

    let extendedPayload: Record<string, unknown> = { ...patch };

    if (touchesVehicle) {
      const modelIn =
        patch.vehicle_model !== undefined
          ? patch.vehicle_model
          : patch.model !== undefined
            ? patch.model
            : ex?.model ?? null;
      const yearIn =
        patch.year !== undefined
          ? patch.year
          : patch.vehicle_year !== undefined
            ? patch.vehicle_year
            : ex?.year ?? null;
      const merged = resolveReviewVehicleFields({
        model: modelIn,
        vehicle_model: modelIn,
        year: yearIn,
        vehicle_year: yearIn,
      });
      extendedPayload = {
        ...patch,
        model: merged.model,
        year: merged.year,
        vehicle_model: merged.model,
        vehicle_year: merged.year,
      };
    }

    extendedPayload = omitUndefined(extendedPayload);

    let up = await supabase
      .from("reviews")
      .update(extendedPayload)
      .eq("id", id);

    if (up.error && isMissingExtendedReviewColumns(up.error)) {
      const {
        vehicle_model,
        vehicle_year,
        year: yearPatch,
        model: modelPatch,
        ...rest
      } = patch;
      const y =
        yearPatch !== undefined
          ? yearPatch
          : vehicle_year !== undefined
            ? vehicle_year
            : ex?.year ?? null;
      const m =
        vehicle_model !== undefined
          ? vehicle_model
          : modelPatch !== undefined
            ? modelPatch
            : ex?.model;
      const legacyUpdate = omitUndefined({
        ...rest,
        model: legacyModelLine(m ?? null, y ?? null) ?? m ?? null,
      });
      up = await supabase.from("reviews").update(legacyUpdate).eq("id", id);
    }

    if (up.error) {
      console.error(up.error);
      return NextResponse.json({ error: up.error.message }, { status: 500 });
    }

    const { data: row, error: selErr } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (selErr || !row) {
      console.error(selErr);
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      review: normalizeReviewRow(row as ReviewRow),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error de base de datos" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error de base de datos" },
      { status: 500 },
    );
  }
}

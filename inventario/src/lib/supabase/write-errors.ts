import { NextResponse } from "next/server";

type SupabaseErrorLike = {
  message?: string;
  code?: string;
};

/**
 * Respuesta JSON cuando falla insert/update y suele ser desajuste de esquema en Supabase.
 */
export function jsonSupabaseWriteError(
  error: SupabaseErrorLike,
  status = 500,
): NextResponse {
  const msg = error.message ?? "Error de base de datos";
  const code = error.code ?? "";
  const schemaMismatch =
    code === "PGRST204" ||
    /schema cache|could not find the ['\w]+ column/i.test(msg);

  return NextResponse.json(
    {
      error: msg,
      code: code || undefined,
      ...(schemaMismatch && {
        hint:
          "Tu tabla public.cars no tiene todas las columnas del panel. Abre Supabase → SQL Editor, pega y ejecuta el archivo supabase/migrations/008_cars_schema_alignment.sql de este proyecto. Luego en Settings → API pulsa «Reload schema» (o espera 1–2 minutos).",
      }),
    },
    { status },
  );
}

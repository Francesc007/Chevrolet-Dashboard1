"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { ReviewRow } from "@/types";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  location: string;
  vehicle_model: string;
  vehicle_year: string;
  photo_url: string;
  comment: string;
};

const empty: FormState = {
  name: "",
  location: "",
  vehicle_model: "",
  vehicle_year: "",
  photo_url: "",
  comment: "",
};

/**
 * Rellena el formulario: `model` solo nombre; año desde columna `year` (o legacy "Nombre · AAAA").
 */
function parseReviewFormVehicle(rv: ReviewRow): {
  vehicle_model: string;
  vehicle_year: string;
} {
  const yRaw =
    rv.year != null && !Number.isNaN(Number(rv.year))
      ? Math.round(Number(rv.year))
      : rv.vehicle_year != null && !Number.isNaN(Number(rv.vehicle_year))
        ? Math.round(Number(rv.vehicle_year))
        : null;
  const yOk = yRaw != null && yRaw >= 1900 && yRaw <= 2100 ? yRaw : null;

  let name = (rv.model ?? rv.vehicle_model ?? "").trim();
  if (yOk != null) {
    name = name.replace(new RegExp(`\\s*·\\s*${yOk}\\s*$`), "").trim();
  }

  if (yOk == null && name.includes("·")) {
    const parts = name.split(/\s*·\s*/).filter(Boolean);
    const last = parts[parts.length - 1]!;
    if (/^\d{4}$/.test(last)) {
      const y = Number(last);
      if (y >= 1900 && y <= 2100) {
        return {
          vehicle_model: parts.slice(0, -1).join(" · ").trim(),
          vehicle_year: String(y),
        };
      }
    }
  }

  if (yOk == null && /^\d{4}$/.test(name)) {
    const y = Number(name);
    if (y >= 1900 && y <= 2100) {
      return { vehicle_model: "", vehicle_year: String(y) };
    }
  }

  return {
    vehicle_model: name,
    vehicle_year: yOk != null ? String(yOk) : "",
  };
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rRes = await fetch("/api/reviews");
    if (!rRes.ok) {
      setError("No se pudieron cargar los datos");
      setLoading(false);
      return;
    }
    const rj = (await rRes.json()) as { reviews: ReviewRow[] };
    setReviews(rj.reviews);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setModal("create");
  }

  function openEdit(rv: ReviewRow) {
    setEditingId(rv.id);
    const { vehicle_model, vehicle_year } = parseReviewFormVehicle(rv);
    setForm({
      name: rv.name,
      location: rv.location ?? "",
      vehicle_model,
      vehicle_year,
      photo_url: rv.photo_url ?? "",
      comment: rv.comment,
    });
    setModal("edit");
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Error al subir");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    setForm((f) => ({ ...f, photo_url: url }));
  }

  function removePhoto() {
    setForm((f) => ({ ...f, photo_url: "" }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const yearStr = form.vehicle_year.trim();
    const yearParsed =
      yearStr === ""
        ? null
        : (() => {
            const n = Number(yearStr);
            return Number.isFinite(n) ? n : null;
          })();
    const modelTrim = form.vehicle_model.trim() || null;
    const payload = {
      car_id: null,
      name: form.name,
      location: form.location || null,
      model: modelTrim,
      year: yearParsed,
      vehicle_model: modelTrim,
      vehicle_year: yearParsed,
      photo_url: form.photo_url || null,
      comment: form.comment,
    };
    const url = editingId ? `/api/reviews/${editingId}` : "/api/reviews";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Error al guardar");
      return;
    }
    setModal(null);
    void load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta reseña?")) return;
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) setError("No se pudo eliminar");
    else void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-wide text-white uppercase">
            Carlos Hernández
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Testimonios de clientes satisfechos
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          aria-pressed={modal === "create"}
          className={cn(
            "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 via-red-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow,filter] duration-150 sm:w-auto",
            "shadow-[0_4px_24px_-4px_rgba(185,28,28,0.5),inset_0_1px_0_0_rgba(254,202,202,0.18)]",
            modal === "create"
              ? "translate-y-0.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)] brightness-95 ring-1 ring-inset ring-black/35"
              : "shadow-lg shadow-red-950/45 hover:brightness-110 hover:shadow-[0_6px_28px_-4px_rgba(220,38,38,0.5)]",
            "active:translate-y-0.5 active:brightness-95 active:ring-1 active:ring-inset active:ring-black/35",
          )}
        >
          <Plus className="h-4 w-4" />
          Nueva reseña
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-white/65">Cargando…</p>
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {reviews.map((rv) => (
            <motion.article
              key={rv.id}
              initial={false}
              className="group flex min-w-0 flex-col items-stretch gap-4 overflow-hidden rounded-2xl border border-red-600/45 bg-white/[0.02] p-4 shadow-[0_0_0_1px_rgba(220,38,38,0.38),0_0_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-red-500/32 sm:flex-row"
            >
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:aspect-auto sm:h-auto sm:w-32 sm:min-h-[7.5rem] sm:self-stretch">
                {rv.photo_url ? (
                  <Image
                    src={rv.photo_url}
                    alt={rv.name}
                    fill
                    className="object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 100vw, 128px"
                  />
                ) : (
                  <div className="flex min-h-[8rem] flex-1 items-center justify-center text-[10px] text-white/55 sm:min-h-0 sm:h-full">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{rv.name}</p>
                <p className="text-xs text-white/70">
                  {rv.location ?? "—"}
                  {(() => {
                    const lineModel = (rv.model ?? rv.vehicle_model ?? "").trim();
                    const y = rv.year ?? rv.vehicle_year;
                    const yStr =
                      y != null && !Number.isNaN(Number(y))
                        ? String(Math.round(Number(y)))
                        : null;
                    const bits = [lineModel || null, yStr].filter(Boolean);
                    return bits.length ? ` · ${bits.join(" · ")}` : "";
                  })()}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-white">
                  {rv.comment}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(rv)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/[0.08] py-1.5 text-xs font-medium text-white transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.1] hover:shadow-[0_0_18px_rgba(255,255,255,0.08)] active:bg-white/[0.14] active:brightness-110"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(rv.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/35 bg-red-950/20 p-2 text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-[#0c0e18] p-5 shadow-2xl sm:p-6"
            >
              <h3 className="text-lg font-semibold text-white">
                {editingId ? "Editar reseña" : "Nueva reseña"}
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <label className="block">
                  <span className="text-xs font-medium text-white/70">Nombre</span>
                  <input
                    className="panel-field"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-white/70">Ubicación</span>
                  <input
                    className="panel-field"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-white/70">Modelo</span>
                  <input
                    className="panel-field"
                    placeholder="Ej. Jetta, CR-V Touring…"
                    value={form.vehicle_model}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vehicle_model: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-white/70">Año</span>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    className="panel-field"
                    placeholder="Ej. 2024"
                    value={form.vehicle_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vehicle_year: e.target.value }))
                    }
                  />
                </label>
                <div className="space-y-3">
                  <span className="text-xs font-medium text-white/70">Foto</span>
                  <div className="flex flex-wrap items-start gap-3">
                    {form.photo_url ? (
                      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80 shadow-inner ring-1 ring-white/5">
                        <Image
                          src={form.photo_url}
                          alt="Foto de la reseña"
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 text-red-400 backdrop-blur-sm transition-colors hover:bg-red-600/85 hover:text-white"
                          aria-label="Quitar foto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-[11px] text-white/55">
                        Vista previa
                      </div>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 self-center rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.04]">
                      <Upload className="h-3.5 w-3.5" />
                      {form.photo_url ? "Cambiar imagen" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadPhoto(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-white/70">Comentario</span>
                  <textarea
                    rows={4}
                    className="panel-field min-h-[7rem] resize-y"
                    value={form.comment}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, comment: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => void save()}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-800 via-red-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow,filter] duration-150",
                    "shadow-[0_4px_24px_-4px_rgba(185,28,28,0.5),inset_0_1px_0_0_rgba(254,202,202,0.18)]",
                    "shadow-lg shadow-red-950/45 hover:brightness-110 hover:shadow-[0_6px_28px_-4px_rgba(220,38,38,0.5)]",
                    "active:translate-y-0.5 active:brightness-95 active:ring-1 active:ring-inset active:ring-black/35",
                    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100 disabled:active:translate-y-0",
                  )}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { ChevroletMarkImage } from "@/components/brand/ChevroletMarkImage";
import { cn } from "@/lib/utils";

const passwordInputClass =
  "mt-0 w-full rounded-xl border border-red-500/40 bg-gradient-to-b from-red-950/28 to-slate-950/55 py-2.5 pl-4 pr-11 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(248,113,113,0.3),0_0_22px_-8px_rgba(185,28,28,0.35)] outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-white/45 focus:border-red-400/70 focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(248,113,113,0.45),0_0_0_3px_rgba(239,68,68,0.38),0_0_26px_-6px_rgba(185,28,28,0.35)]";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Error al iniciar sesión");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-background px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(185,28,28,0.14),_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(127,29,29,0.12),_transparent_55%)]" />
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-red-500/45 bg-card/90 p-8 shadow-[0_0_0_1px_rgba(220,38,38,0.42),0_0_36px_-4px_rgba(185,28,28,0.35),0_0_56px_-12px_rgba(127,29,29,0.2),0_20px_50px_-12px_rgba(15,23,42,0.85)] ring-1 ring-red-500/35 backdrop-blur-xl"
      >
        <div className="mb-8 flex w-full justify-center px-2">
          <ChevroletMarkImage
            width={220}
            height={68}
            className="min-h-[56px] max-w-[min(100%,280px)]"
            priority
          />
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-white/70"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordInputClass}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-red-950/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e18]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-800 via-red-600 to-rose-600 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow,filter] duration-150",
              "shadow-[0_4px_24px_-4px_rgba(185,28,28,0.5),inset_0_1px_0_0_rgba(254,202,202,0.18)]",
              "shadow-lg shadow-red-950/45 hover:brightness-110 hover:shadow-[0_6px_28px_-4px_rgba(220,38,38,0.5)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:translate-y-0.5 active:brightness-95 active:ring-1 active:ring-inset active:ring-black/35",
              "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100 disabled:active:translate-y-0",
            )}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

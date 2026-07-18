"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function login(event?: React.FormEvent) {
    event?.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    setResetSent(false);

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "E-Mail oder Passwort ist falsch.");
      router.push("/admin");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fehler beim Einloggen.");
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    if (!email.trim()) {
      setError("Bitte zuerst deine E-Mail-Adresse eingeben.");
      return;
    }
    setLoading(true);
    setError("");
    setResetSent(false);
    try {
      const res = await fetch("/api/admin-passwort-vergessen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setResetSent(true);
    } catch {
      setError("Die E-Mail konnte nicht versendet werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-8 text-zinc-950">
      <form onSubmit={login} className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
        <div className="mb-8 text-center">
          <img src="/wolnaa-logo-gold-header.png" alt="Wolnaa" className="h-10 w-auto mx-auto mb-4" />
          <p className="m-0 text-sm text-zinc-500">Admin-Portal</p>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {resetSent && <div className="mb-5 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">Falls ein Admin-Konto existiert, wurde ein Link zum Festlegen des Passworts versendet.</div>}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">E-Mail-Adresse</label>
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="kontakt@wolnaa.de" autoComplete="email" className="w-full rounded-lg border border-zinc-300 px-3.5 py-3 text-[15px] text-zinc-950 outline-none focus:border-[#d6b36a]" />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Passwort</label>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" className="w-full rounded-lg border border-zinc-300 px-3.5 py-3 text-[15px] text-zinc-950 outline-none focus:border-[#d6b36a]" />
        </div>
        <button type="submit" disabled={loading || !email.trim() || !password} className="w-full rounded-lg bg-[#d6b36a] py-3.5 text-[15px] font-bold text-zinc-950 hover:bg-[#c5a15b] disabled:cursor-not-allowed disabled:bg-zinc-300">
          {loading ? "Prüfe..." : "Einloggen"}
        </button>
        <button type="button" onClick={requestPasswordReset} disabled={loading} className="mt-3 w-full border-0 bg-transparent p-2 text-sm text-zinc-500 hover:text-zinc-950 disabled:opacity-50">Passwort festlegen oder vergessen?</button>
        <p className="mt-5 text-center text-xs text-zinc-400">Nur für Administratoren.</p>
      </form>
    </main>
  );
}

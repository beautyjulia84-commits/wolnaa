"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AdminPasswortFestlegen() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(!!session));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function save() {
    setError("");
    if (password.length < 10) return setError("Das Passwort muss mindestens 10 Zeichen lang sein.");
    if (password !== repeat) return setError("Die Passwörter stimmen nicht überein.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError("Das Passwort konnte nicht gespeichert werden. Bitte fordere einen neuen Link an.");
    setSuccess(true);
    await supabase.auth.signOut();
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-8 text-zinc-950">
      <div className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
        <img src="/wolnaa-logo-gold-header.png" alt="Wolnaa" className="h-10 w-auto mb-7" />
        <h1 className="mb-2 text-2xl font-bold">Passwort festlegen</h1>
        <p className="mb-6 text-sm text-zinc-500">Wähle ein sicheres Passwort für dein Administratorkonto.</p>
        {success ? <><p className="text-green-700">Dein Passwort wurde gespeichert.</p><a href="/admin-login" className="mt-5 block rounded-lg bg-yellow-400 p-3 text-center font-bold text-zinc-950 no-underline">Zur Anmeldung</a></> : !ready ? <p className="text-sm text-red-600">Der Link ist ungültig oder abgelaufen. Bitte fordere auf der Loginseite einen neuen Link an.</p> : <>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <label className="mb-1.5 block text-sm text-zinc-700">Neues Passwort</label>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" className="mb-4 w-full rounded-lg border border-zinc-300 p-3 text-zinc-950 outline-none focus:border-yellow-400" />
          <label className="mb-1.5 block text-sm text-zinc-700">Passwort wiederholen</label>
          <input type="password" value={repeat} onChange={event => setRepeat(event.target.value)} autoComplete="new-password" className="mb-5 w-full rounded-lg border border-zinc-300 p-3 text-zinc-950 outline-none focus:border-yellow-400" />
          <button onClick={save} disabled={loading} className="w-full rounded-lg bg-yellow-400 p-3.5 font-bold text-zinc-950 disabled:opacity-50">{loading ? "Speichert…" : "Passwort speichern"}</button>
        </>}
      </div>
    </main>
  );
}

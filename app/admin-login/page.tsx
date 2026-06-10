"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Falsches Passwort.");
    }
  }
  function handleChange(e: { currentTarget: { value: string } }) {
    setPassword(e.currentTarget.value);
  }
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-8">
        <h1 className="text-3xl font-black text-center mb-6">WOLNAA Admin</h1>
        <input
          type="password"
          placeholder="Admin Passwort"
          value={password}
          onChange={handleChange}
          className="w-full rounded-2xl bg-black border border-zinc-700 px-4 py-4 text-white outline-none focus:border-yellow-400"
        />
        {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        <button className="w-full mt-5 rounded-2xl bg-yellow-400 py-4 font-black text-black">
          Einloggen
        </button>
      </form>
    </main>
  );
}

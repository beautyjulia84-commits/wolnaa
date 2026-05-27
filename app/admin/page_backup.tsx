"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Ticket = {
  id: string;
  ticket_id: string;
  event_title: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: string;
  checked_in_at: string | null;
  created_at: string;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("wolnaa-admin") === "true") {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadTickets();
    }
  }, [authed]);

  async function login() {
    setPwError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      localStorage.setItem("wolnaa-admin", "true");
      localStorage.setItem("wolnaa-admin-pw", password);
      setAuthed(true);
    } else {
      setPwError("Falsches Passwort.");
    }
  }

  async function loadTickets() {
    setLoading(true);

    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    setTickets(data ?? []);
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem("wolnaa-admin");
    localStorage.removeItem("wolnaa-admin-pw");
    setAuthed(false);
  }

  const filtered = filter
    ? tickets.filter((t) =>
        t.event_title
          .toLowerCase()
          .includes(filter.toLowerCase())
      )
    : tickets;

  const totalRevenue = filtered.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const checkedIn = filtered.filter(
    (t) => t.status === "checked_in"
  ).length;

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-black mb-2 text-center">
            Admin
          </h1>

          <p className="text-zinc-500 text-sm text-center mb-8">
            WOLNAA Adminbereich
          </p>

          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPwError("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && login()
              }
              placeholder="Passwort"
              className="w-full rounded-2xl bg-black border border-zinc-800 focus:border-yellow-400 px-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-colors mb-3"
            />

            {pwError && (
              <p className="text-red-400 text-sm mb-3">
                {pwError}
              </p>
            )}

            <button
              onClick={login}
              className="w-full rounded-2xl bg-yellow-400 text-black font-black py-4 hover:bg-yellow-300 transition-colors"
            >
              Einloggen
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <h1 className="text-xl font-black">
          WOLNAA Admin
        </h1>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/scanner"
            className="rounded-2xl bg-yellow-400 text-black font-bold text-sm px-5 py-2.5 hover:bg-yellow-300 transition-colors"
          >
            📷 Scanner
          </Link>

          <button
            onClick={logout}
            className="rounded-2xl border border-white/10 text-zinc-400 text-sm px-5 py-2.5 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Tickets gesamt",
              value: filtered.length,
            },
            {
              label: "Eingecheckt",
              value: checkedIn,
            },
            {
              label: "Umsatz",
              value: `${totalRevenue.toFixed(2)} €`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-zinc-950 border border-white/10 p-5 text-center"
            >
              <p className="text-2xl font-black text-yellow-400">
                {stat.value}
              </p>

              <p className="text-zinc-500 text-sm mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <input
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            placeholder="Nach Event filtern..."
            className="flex-1 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-yellow-400 px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition-colors text-sm"
          />

          <button
            onClick={loadTickets}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
          >
            ↻ Aktualisieren
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-950">
                    {[
                      "Name",
                      "Event",
                      "Betrag",
                      "Status",
                      "Eingecheckt um",
                      "Ticket-ID",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-zinc-500 font-medium px-5 py-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-zinc-600 py-12"
                      >
                        Keine Tickets gefunden.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {ticket.customer_name}
                          </p>

                          <p className="text-zinc-500 text-xs">
                            {ticket.customer_email}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-zinc-300">
                          {ticket.event_title}
                        </td>

                        <td className="px-5 py-4 text-yellow-400 font-bold">
                          {ticket.amount.toFixed(2)} €
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              ticket.status ===
                              "checked_in"
                                ? "bg-green-400/10 text-green-400"
                                : "bg-yellow-400/10 text-yellow-400"
                            }`}
                          >
                            {ticket.status ===
                            "checked_in"
                              ? "✓ Eingecheckt"
                              : "Bezahlt"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-zinc-500 text-xs">
                          {ticket.checked_in_at
                            ? new Date(
                                ticket.checked_in_at
                              ).toLocaleString("de-DE")
                            : "–"}
                        </td>

                        <td className="px-5 py-4 font-mono text-zinc-600 text-xs">
                          {ticket.ticket_id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
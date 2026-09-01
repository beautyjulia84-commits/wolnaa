"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Activity = { count: number; eventTitle: string; eventSlug: string | null };

export default function PurchaseActivity({ lang }: { lang: "de" | "ru" }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/purchase-activity")
      .then(response => response.ok ? response.json() : { activities: [] })
      .then(data => setActivities(Array.isArray(data.activities) ? data.activities : []))
      .catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    if (!activities.length || dismissed) return;

    let hideTimer: number;
    let pauseTimer: number;

    const showActivity = () => {
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        pauseTimer = window.setTimeout(() => {
          setIndex(current => (current + 1) % activities.length);
          showActivity();
        }, 8000);
      }, 3500);
    };

    const revealTimer = window.setTimeout(showActivity, 3500);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(pauseTimer);
    };
  }, [activities, dismissed]);

  if (!activities.length || dismissed) return null;
  const activity = activities[index];
  const russianTicketWord = activity.count % 10 === 1 && activity.count % 100 !== 11
    ? "билет"
    : activity.count % 10 >= 2 && activity.count % 10 <= 4 && (activity.count % 100 < 12 || activity.count % 100 > 14)
      ? "билета"
      : "билетов";
  const message = lang === "ru"
    ? `${activity.count === 1 ? "Куплен" : "Куплено"} ${activity.count} ${russianTicketWord} на ${activity.eventTitle}`
    : `${activity.count === 1 ? "1 Ticket wurde" : `${activity.count} Tickets wurden`} für ${activity.eventTitle} gekauft`;

  const content = (
    <div className="flex min-w-0 items-center gap-3 pr-7">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6b36a]/15 text-lg">🎟</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#d6b36a]">
          {lang === "ru" ? "Недавняя покупка" : "Kürzlich gekauft"}
        </span>
        <span className="mt-1 block text-sm font-medium leading-snug text-white">{message}</span>
      </span>
    </div>
  );

  return (
    <aside
      aria-live="polite"
      className={`fixed bottom-5 left-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl transition-all duration-500 md:bottom-7 md:left-7 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"}`}
    >
      <button
        type="button"
        aria-label={lang === "ru" ? "Закрыть" : "Schließen"}
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center text-sm text-zinc-500 transition-colors hover:text-white"
      >
        ×
      </button>
      {activity.eventSlug
        ? <Link href={`/event/${activity.eventSlug}`} className="block no-underline">{content}</Link>
        : content}
    </aside>
  );
}

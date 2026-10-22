"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/#events", label: "Events", icon: "calendar" },
  { href: "/muttizettel", label: "Muttizettel", icon: "document" },
  { href: "/mein-bereich", label: "Mein Bereich", icon: "user" },
];
export function MobileMenuIcon({ name }: { name: string }) {
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "home" ? <><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" /></> :
      name === "calendar" ? <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18" /></> :
      name === "document" ? <><path d="M14 2H5v20h14V7Z M14 2v5h5M8 12h8m-8 4h6" /></> :
      <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
  </svg>;
}
export default function MobileNavigation() {
  const pathname = usePathname();
  const [eventsVisible, setEventsVisible] = useState(false);
  useEffect(() => {
    setEventsVisible(false);
    if (pathname !== "/") return;
    const section = document.getElementById("events");
    if (!section) return;
    const update = () => {
      const rect = section.getBoundingClientRect();
      setEventsVisible(rect.top < window.innerHeight * .55 && rect.bottom > window.innerHeight * .25);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [pathname]);
  if (!(pathname === "/" || pathname === "/muttizettel" || pathname === "/mein-bereich")) return null;
  const active = pathname === "/muttizettel" ? 2 : pathname === "/mein-bereich" ? 3 : pathname?.startsWith("/event/") || eventsVisible ? 1 : 0;
  return <nav className={`wolnaa-mobile-nav${pathname?.startsWith("/event/") ? " wolnaa-nav-flat" : ""}`} aria-label="Mobile Hauptnavigation">
    {items.map((item, index) => <Link key={item.href} href={item.href} aria-current={index === active ? "page" : undefined}>
      <span className="wolnaa-nav-icon"><MobileMenuIcon name={item.icon} /></span><span>{item.label}</span>
    </Link>)}
  </nav>;
}

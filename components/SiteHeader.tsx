"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MobileMenuIcon } from "./MobileNavigation";
type Lang = "de" | "ru";
export default function SiteHeader({lang: controlledLang, onLanguageChange}: {lang?: Lang; onLanguageChange?: (lang: Lang) => void}) {
  const [savedLang, setSavedLang] = useState<Lang>("de");
  const lang = controlledLang ?? savedLang;
  useEffect(() => {
    try {
      const stored = localStorage.getItem("wolnaa-language");
      if (stored === "de" || stored === "ru") { setSavedLang(stored); onLanguageChange?.(stored); }
    } catch { /* Navigation remains usable when storage is unavailable. */ }
  }, [onLanguageChange]);
  function changeLanguage(value: Lang) {
    setSavedLang(value);
    onLanguageChange?.(value);
    try { localStorage.setItem("wolnaa-language", value); } catch { /* Optional preference storage. */ }
  }
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [menuOpen]);
  return (
      <header ref={headerRef} className="wolnaa-site-header fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/65 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" aria-label="WOLNAA Startseite" className="flex items-center">
            <Image src="/wolnaa-logo-gold-header.png" alt="WOLNAA" width={220} height={81} priority className="h-6 w-auto object-contain md:h-7" />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-bold uppercase tracking-[0.22em] text-white/75 md:flex">
            <a href="/#events" className="transition-colors hover:text-[#d6b36a]">{lang === "de" ? "Events" : "Мероприятия"}</a>
            <a href="/#kontakt" className="transition-colors hover:text-[#d6b36a]">{lang === "de" ? "Kontakt" : "Контакты"}</a>
            <div className="wolnaa-language" role="group" aria-label={lang === "de" ? "Sprache wählen" : "Выбрать язык"}>
              {(["de", "ru"] as Lang[]).map(item => (
                <button key={item} type="button" onClick={() => changeLanguage(item)} aria-pressed={lang === item} aria-label={item === "de" ? "Deutsch" : "Русский"} lang={item}>
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
        </nav>

          <div className="wolnaa-header-controls">
            <button ref={menuButtonRef} type="button" className="wolnaa-menu-toggle" aria-expanded={menuOpen} aria-controls="wolnaa-header-menu" aria-label={lang === "de" ? (menuOpen ? "Menü schließen" : "Menü öffnen") : (menuOpen ? "Закрыть меню" : "Открыть меню")} onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {menuOpen ? <path d="m5 5 14 14M19 5 5 19" /> : <path d="M3 5h18M3 12h18M3 19h18" />}
              </svg>
            </button>
          </div>
        </div>
        <nav id="wolnaa-header-menu" className="wolnaa-header-menu" hidden={!menuOpen} aria-label={lang === "de" ? "Hauptmenü" : "Главное меню"}>
          {[
            ["/", "Startseite", "Главная"],
            ["/#events", "Events", "Мероприятия"],
            ["/#momente", "Fotos", "Фото"],
            ["/#faq", "FAQ & Support", "Вопросы и поддержка"],
            ["/#kontakt", "Kontakt", "Контакты"],
            ["/muttizettel", "Muttizettel", "Разрешение родителей"],
            ["/mein-bereich", "Mein Bereich", "Мои билеты"],
          ].map(([href, de, ru]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{lang === "de" ? de : ru}</a>)}
          <a href="/#events" className="wolnaa-gold-button wolnaa-menu-cta" onClick={() => setMenuOpen(false)}><MobileMenuIcon name="calendar" />{lang === "de" ? "Tickets sichern" : "Купить билеты"}<span aria-hidden="true">→</span></a>
          <div className="wolnaa-language" role="group" aria-label={lang === "de" ? "Sprache wählen" : "Выбрать язык"}>
              {(["de", "ru"] as Lang[]).map(item => (
                <button key={item} type="button" onClick={() => changeLanguage(item)} aria-pressed={lang === item} aria-label={item === "de" ? "Deutsch" : "Русский"} lang={item}>
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
        </nav>
      </header>
  );
}

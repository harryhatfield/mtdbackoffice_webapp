"use client";
import { useEffect } from "react";

/** Mobile menu + header shadow on scroll (ported from the original site script). */
export function SiteScripts() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    const btn = header?.querySelector<HTMLButtonElement>(".menu-btn") ?? null;
    const nav = document.getElementById("site-nav");
    const setH = () => header && document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 8);
    const toggle = (open: boolean, focus = false) => {
      if (!btn || !nav) return;
      btn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      setH();
      if (open && focus) nav.querySelector("a")?.focus();
    };
    const onBtn = () => toggle(btn?.getAttribute("aria-expanded") !== "true", true);
    const onNav = (e: Event) => { if ((e.target as HTMLElement).closest("a")) toggle(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && btn?.getAttribute("aria-expanded") === "true") { toggle(false); btn.focus(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", setH);
    document.addEventListener("keydown", onKey);
    btn?.addEventListener("click", onBtn);
    nav?.addEventListener("click", onNav);
    onScroll(); setH();
    return () => {
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", setH);
      document.removeEventListener("keydown", onKey); btn?.removeEventListener("click", onBtn); nav?.removeEventListener("click", onNav);
    };
  }, []);
  return null;
}

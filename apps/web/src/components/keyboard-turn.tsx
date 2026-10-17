"use client";

import { useEffect } from "react";

// ← / → turn pages by clicking the visible page-turn arrow (page-turn.tsx), so the transition type and the
// page_turn analytics event stay defined in one place. Ignored while typing, with modifier keys, or while a
// popover or the menu is open.
export function KeyboardTurn() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if (document.querySelector(":popover-open, details[open]")) return;

      const key = e.key === "ArrowRight" ? "next" : "prev";
      // Next keeps recently visited pages mounted but hidden; use the arrow on the page being shown.
      const link = [...document.querySelectorAll<HTMLAnchorElement>(`a[data-key-turn="${key}"]`)].find((a) => a.offsetParent !== null);
      if (!link) return;
      e.preventDefault();
      link.dataset.method = "keyboard";
      link.click();
      delete link.dataset.method;
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return null;
}

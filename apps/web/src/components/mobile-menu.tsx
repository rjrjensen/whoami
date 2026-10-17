"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// The header stays mounted across page turns, so close the menu after each navigation.
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className="relative lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-line px-3 text-sm [&::-webkit-details-marker]:hidden">
        Menu
      </summary>
      {children}
    </details>
  );
}

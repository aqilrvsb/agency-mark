"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      {/* Mobile top bar with hamburger — only on small screens */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-extrabold text-base">PeningAds</span>
        <span className="w-10" />
      </div>

      {/* Sidebar — fixed overlay on mobile when open, static on md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-[var(--color-border)] bg-[var(--color-bg-soft)] flex flex-col transition-transform md:static md:w-64 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </aside>

      {/* Backdrop */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          aria-label="Close menu"
        />
      )}
    </>
  );
}

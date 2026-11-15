import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./Brand";
import { SoundToggle } from "./SoundToggle";
import { dashboardPath } from "../lib/config";

const navigation = [
  { href: "#capabilities", name: "Capabilities" },
  { href: "#regions", name: "Regions" },
  { href: "#atlas", name: "Atlas" },
  { href: "#telemetry", name: "Telemetry" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const resize = () => {
      if (media.matches) setOpen(false);
    };
    document.addEventListener("keydown", close);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", close);
      media.removeEventListener("change", resize);
    };
  }, [open]);

  return (
    <header
      className="site-header absolute inset-x-0 top-0 z-40"
    >
      <div className="page-width flex h-24 items-center justify-between gap-4">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 lg:gap-9 lg:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              data-cursor="view"
              className="quiet-link text-[11px] tracking-wider transition-colors hover:text-copper"
            >
              {item.name}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SoundToggle />
          <a
            href={dashboardPath}
            data-cursor="explore"
            className="button-secondary hidden min-h-10 px-5 py-2 text-[10px] tracking-wider sm:inline-flex"
          >
            Open dashboard
            <ArrowUpRight size={14} />
          </a>
          <button
            ref={menuButton}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="icon-button lg:hidden"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-24 max-h-[calc(100dvh-96px)] overflow-y-auto border-b border-white/10 bg-void/95 px-6 py-8 backdrop-blur-xl lg:hidden"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center justify-between border-b border-white/10 text-lg"
            >
              {item.name}
              <ArrowUpRight size={18} className="text-copper" />
            </a>
          ))}
          <a
            href={dashboardPath}
            onClick={() => setOpen(false)}
            className="button-primary mt-6 w-full"
          >
            Open dashboard
            <ArrowUpRight size={16} />
          </a>
        </nav>
      )}
    </header>
  );
}

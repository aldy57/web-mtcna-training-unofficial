"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "danger" | "accent";
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  align?: "left" | "right";
  buttonClassName?: string;
}

function BurgerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

interface MenuCoords {
  top: number;
  left?: number;
  right?: number;
}

export function ActionMenu({
  items,
  ariaLabel = "Menu aksi",
  align = "right",
  buttonClassName,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Hitung posisi floating menu relatif terhadap tombol pemicu
  function updateCoords() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const approximateHeight = items.length * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUpward = spaceBelow < approximateHeight && rect.top > approximateHeight;

    const top = opensUpward
      ? Math.max(8, rect.top - approximateHeight - 4)
      : Math.min(window.innerHeight - approximateHeight - 8, rect.bottom + 4);

    if (align === "left") {
      setCoords({
        top,
        left: Math.max(8, rect.left),
      });
    } else {
      setCoords({
        top,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
  }

  function handleToggleOpen() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      updateCoords();
      setIsOpen(true);
    }
  }

  // Tutup menu saat klik di luar, scroll halaman, atau resize window
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleScrollOrResize() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  if (items.length === 0) {
    return null;
  }

  const triggerButton = (
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={handleToggleOpen}
      className={
        buttonClassName ??
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:bg-neutral-100 hover:border-neutral-300 transition-all cursor-pointer shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
      }
    >
      <BurgerIcon className="h-4 w-4" />
    </button>
  );

  const menuDropdown = isOpen && coords && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            ...(coords.left !== undefined ? { left: `${coords.left}px` } : {}),
            ...(coords.right !== undefined ? { right: `${coords.right}px` } : {}),
          }}
          className="z-100 min-w-[10.5rem] rounded-xl border border-border bg-surface p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
        >
          {items.map((item) => {
            const isDanger = item.variant === "danger";
            const isAccent = item.variant === "accent";

            const itemClass = `w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
              item.disabled
                ? "opacity-50 cursor-not-allowed text-muted"
                : isDanger
                  ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  : isAccent
                    ? "text-accent hover:bg-surface-selected hover:text-accent-hover font-semibold"
                    : "text-foreground hover:bg-neutral-100"
            }`;

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick?.();
                  }}
                  className={itemClass}
                >
                  {item.icon && (
                    <span className="shrink-0 text-current">{item.icon}</span>
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={itemClass}
              >
                {item.icon && (
                  <span className="shrink-0 text-current">{item.icon}</span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {triggerButton}
      {menuDropdown}
    </>
  );
}

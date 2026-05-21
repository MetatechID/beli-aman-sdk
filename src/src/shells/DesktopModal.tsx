"use client";

import { useEffect, type ReactNode } from "react";

export function DesktopModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Lock body scroll while open
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="ba-shell ba-shell-desktop" role="dialog" aria-modal="true">
      <div className="ba-backdrop" onClick={onClose} />
      <div className="ba-modal">
        <header className="ba-modal-header">
          <div className="ba-modal-brand">
            <BeliAmanLogo />
            <span className="ba-modal-brand-text">Beli Aman</span>
          </div>
          <span className="ba-modal-title">{title}</span>
          <button className="ba-iconbtn" aria-label="Tutup" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z" />
            </svg>
          </button>
        </header>
        <div className="ba-modal-body">{children}</div>
      </div>
    </div>
  );
}

function BeliAmanLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <defs>
        <linearGradient id="ba-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <path
        d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16Z"
        fill="url(#ba-grad)"
      />
    </svg>
  );
}

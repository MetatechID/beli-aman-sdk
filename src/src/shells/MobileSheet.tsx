"use client";

import { useEffect, type ReactNode } from "react";

export function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div className="ba-shell ba-shell-mobile" role="dialog" aria-modal="true">
      <div className="ba-backdrop" onClick={onClose} />
      <div className="ba-sheet">
        <button className="ba-sheet-grabber" aria-label="Tutup" onClick={onClose} />
        <header className="ba-sheet-header">
          <span className="ba-sheet-title">{title}</span>
          <button className="ba-iconbtn" aria-label="Tutup" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z" />
            </svg>
          </button>
        </header>
        <div className="ba-sheet-body">{children}</div>
      </div>
    </div>
  );
}

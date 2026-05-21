"use client";

import { useBeliAman, type CartItemInput } from "./BeliAmanProvider";

export interface BeliAmanButtonProps {
  brandSlug: string;
  items: CartItemInput[];
  className?: string;
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
}

export function BeliAmanButton({
  brandSlug,
  items,
  className,
  fullWidth = false,
  variant = "primary",
}: BeliAmanButtonProps) {
  const { open, brandTheme } = useBeliAman();

  return (
    <button
      type="button"
      className={[
        "ba-cta",
        variant === "primary" ? "ba-cta-primary" : "ba-cta-secondary",
        fullWidth ? "ba-cta-fw" : "",
        className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => open({ brandSlug, items })}
    >
      <span className="ba-cta-shield" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16Z" />
        </svg>
      </span>
      <span className="ba-cta-label">{brandTheme.copy.beliAman}</span>
    </button>
  );
}

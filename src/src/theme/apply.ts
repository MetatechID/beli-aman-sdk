// Applies a BrandTheme to the document by setting CSS custom properties on <html>.

import type { BrandTheme } from "./tokens";

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

export function applyBrandTheme(theme: BrandTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.brand = theme.slug;

  for (const [k, v] of Object.entries(theme.colors)) {
    root.style.setProperty(`--ba-c-${kebab(k)}`, v);
  }
  for (const [k, v] of Object.entries(theme.radius)) {
    root.style.setProperty(`--ba-r-${k}`, v);
  }
  root.style.setProperty(`--ba-font-heading`, theme.fonts.heading);
  root.style.setProperty(`--ba-font-body`, theme.fonts.body);
}

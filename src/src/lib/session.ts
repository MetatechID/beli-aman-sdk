// Persists the in-flight Beli Aman flow to sessionStorage so a tab refresh
// resumes at the same step instead of dumping the user back at the cart.

const KEY = "ba_flow_v1";

export type FlowStep =
  | "sign-in"
  | "cart-review"
  | "confirm"
  | "payment"
  | "processing"
  | "done"
  | "error";

export interface FlowState {
  step: FlowStep;
  brandSlug: string;
  items: { sku: string; qty: number }[];
  orderId?: string;
  resumeUrl?: string;
}

export function readFlow(): FlowState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlowState;
  } catch {
    return null;
  }
}

export function writeFlow(state: FlowState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sessionStorage might be disabled in private mode; non-fatal.
  }
}

export function clearFlow(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

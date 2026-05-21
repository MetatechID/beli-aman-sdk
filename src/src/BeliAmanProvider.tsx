"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { applyBrandTheme } from "./theme/apply";
import type { BrandTheme } from "./theme/tokens";
import {
  initFirebase,
  getFirebaseAuth,
  resolveRedirectSignIn,
  watchUser,
  signInWithGoogle,
  signOutCurrent,
  type FirebaseConfig,
} from "./lib/firebase";
import { api, type ApiOptions, type OrderResponse, type ShippingChoice } from "./lib/api";
import {
  clearFlow,
  readFlow,
  writeFlow,
  type FlowState,
  type FlowStep,
} from "./lib/session";
import { DesktopModal } from "./shells/DesktopModal";
import { MobileSheet } from "./shells/MobileSheet";
import { StepSignIn } from "./steps/StepSignIn";
import { StepCartReview } from "./steps/StepCartReview";
import { StepConfirm } from "./steps/StepConfirm";
import { StepPayment } from "./steps/StepPayment";
import { StepProcessing } from "./steps/StepProcessing";
import { StepDone } from "./steps/StepDone";

export interface CartItemInput {
  sku: string;
  qty: number;
}

export interface SavedAddress {
  id?: string;
  recipient_name?: string;
  phone_e164?: string;
  line1?: string;
  kota?: string;
  provinsi?: string;
  postal_code?: string;
  is_default?: boolean;
  label?: string;
}

export interface BeliAmanConfig {
  bapUrl: string;
  firebase: FirebaseConfig;
  brand: BrandTheme;
  /** Optional. If set, shows a tiny "demo mode" badge. */
  demoMode?: boolean;
}

interface OpenArgs {
  brandSlug: string;
  items: CartItemInput[];
}

interface BeliAmanContextValue {
  isOpen: boolean;
  step: FlowStep;
  brandTheme: BrandTheme;

  // signed-in user (Firebase) + materialized server profile
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;

  // current order (set after createOrder)
  order: OrderResponse | null;

  // current cart context (set when open() is called)
  brandSlug: string;
  items: CartItemInput[];

  // mocked payment selection (visual fidelity only)
  paymentTab: "va" | "ewallet" | "qris" | "card" | "retail";
  paymentBank: string;
  setPaymentTab: (t: BeliAmanContextValue["paymentTab"]) => void;
  setPaymentBank: (b: string) => void;

  // navigation
  open: (args: OpenArgs) => void;
  close: () => void;
  goTo: (step: FlowStep) => void;

  // step actions
  startSignIn: () => Promise<void>;
  /** Trigger Beli Aman identity SSO sign-in (Google) without opening the
   *  checkout flow. Use this for top-level "Masuk" / "Daftar" buttons. */
  signInIdentity: () => Promise<void>;
  /** Sign the user out of Beli Aman identity. */
  signOutIdentity: () => Promise<void>;
  /** User's default saved address (if any). Loaded after sign-in. */
  defaultAddress: SavedAddress | null;
  submitCartReview: (input: { addressInline: any; shipping?: ShippingChoice }) => Promise<void>;
  proceedToPayment: () => Promise<void>;
  confirmPayment: () => Promise<void>;
  resetFlow: () => void;

  // helpers
  apiOpts: ApiOptions;
  formatPrice: (idr: number) => string;
}

const Ctx = createContext<BeliAmanContextValue | null>(null);

export function useBeliAman(): BeliAmanContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBeliAman must be used inside <BeliAmanProvider>");
  return v;
}

export function BeliAmanProvider({
  config,
  children,
}: {
  config: BeliAmanConfig;
  children: ReactNode;
}) {
  // Apply brand theme on mount + when brand changes.
  useEffect(() => {
    applyBrandTheme(config.brand);
  }, [config.brand]);

  // Init Firebase once.
  useEffect(() => {
    initFirebase(config.firebase);
  }, [config.firebase]);

  // Watch Firebase user.
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);

  useEffect(() => {
    const unsub = watchUser(config.firebase, (user) => {
      setSignedIn(!!user);
      setEmail(user?.email ?? null);
      setDisplayName(user?.displayName ?? null);
      setPhotoUrl(user?.photoURL ?? null);
      if (!user) setDefaultAddress(null);
    });
    return unsub;
  }, [config.firebase]);

  // Flow state.
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>("sign-in");
  const [brandSlug, setBrandSlug] = useState(config.brand.slug);
  const [items, setItems] = useState<CartItemInput[]>([]);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mocked payment-screen state (purely visual)
  const [paymentTab, setPaymentTab] = useState<BeliAmanContextValue["paymentTab"]>("va");
  const [paymentBank, setPaymentBank] = useState<string>("BCA");

  // Restore flow on mount (single shot).
  // We only auto-restore in two narrow cases:
  //   (a) An order has already been created (we're past payment-confirm) so
  //       we can re-show the "Done" or "Processing" step, OR
  //   (b) The user is mid-payment and refreshed the same payment URL.
  // We deliberately do NOT auto-restore the early steps (sign-in, cart-review,
  // confirm) because the user expects those to start by clicking the button.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    // First check: did we just come back from a Firebase redirect sign-in?
    resolveRedirectSignIn(config.firebase).catch(() => null);

    const saved = readFlow();
    if (!saved) return;

    // Always nuke completed or "early" flows — they must never auto-pop.
    const earlySteps = new Set<FlowStep>(["sign-in", "cart-review", "confirm"]);
    if (saved.step === "done" || earlySteps.has(saved.step)) {
      clearFlow();
      return;
    }

    // For payment / processing, also require the user to still be on the
    // same URL — otherwise discard.
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!saved.resumeUrl || saved.resumeUrl !== currentUrl) {
      clearFlow();
      return;
    }

    setBrandSlug(saved.brandSlug);
    setItems(saved.items);
    setStep(saved.step);
    setIsOpen(true);
    // Reconcile order state from server
    if (saved.orderId) {
      api
        .getOrder(apiOptsRef.current!, saved.orderId)
        .then((o) => {
          setOrder(o);
          if (o.state === "ESCROW_HELD") setStep("done");
        })
        .catch(() => {
          /* stale order — ignore */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // API options object. Kept in a ref so async callbacks can grab it lazily.
  const apiOpts = useMemo<ApiOptions>(
    () => ({
      bapUrl: config.bapUrl,
      firebase: config.firebase,
      getIdToken: async () => {
        const auth = getFirebaseAuth(config.firebase);
        if (!auth.currentUser) return null;
        return await auth.currentUser.getIdToken();
      },
    }),
    [config.bapUrl, config.firebase],
  );
  const apiOptsRef = useRef<ApiOptions | null>(null);
  apiOptsRef.current = apiOpts;

  // Persist flow state on changes.
  useEffect(() => {
    if (!isOpen) return;
    const flow: FlowState = {
      step,
      brandSlug,
      items,
      orderId: order?.id,
      resumeUrl: typeof window !== "undefined" ? window.location.href : undefined,
    };
    writeFlow(flow);
  }, [isOpen, step, brandSlug, items, order]);

  const open = useCallback(
    (args: OpenArgs) => {
      setBrandSlug(args.brandSlug);
      setItems(args.items);
      setOrder(null);
      setError(null);
      setStep(signedIn ? "cart-review" : "sign-in");
      setIsOpen(true);
    },
    [signedIn],
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetFlow = useCallback(() => {
    setIsOpen(false);
    setOrder(null);
    setItems([]);
    setStep("sign-in");
    setError(null);
    clearFlow();
  }, []);

  // ------ Step actions ------

  const startSignIn = useCallback(async () => {
    // The actual signInWithGoogle call lives in StepSignIn; here we just react.
    // After the Firebase user materializes, exchange the token with the BAP.
    try {
      await api.exchangeToken(apiOpts);
      setStep("cart-review");
    } catch (e: any) {
      setError(e?.message || "Sign-in failed");
    }
  }, [apiOpts]);

  const signInIdentity = useCallback(async () => {
    try {
      await signInWithGoogle(config.firebase);
      // Exchange Firebase token → BAP profile so the user has a server-side record.
      try {
        await api.exchangeToken(apiOpts);
      } catch {
        /* exchange failure is non-fatal for the identity UI */
      }
    } catch (e: any) {
      if (e?.message === "REDIRECT_IN_PROGRESS") return;
      throw e;
    }
  }, [apiOpts, config.firebase]);

  const signOutIdentity = useCallback(async () => {
    try {
      await signOutCurrent(config.firebase);
    } finally {
      setDefaultAddress(null);
    }
  }, [config.firebase]);

  // Load the user's saved default address once they're signed in.
  useEffect(() => {
    if (!signedIn) {
      setDefaultAddress(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const addresses = (await api.listAddresses(apiOpts)) as SavedAddress[] | { data: SavedAddress[] } | null;
        if (cancelled) return;
        const list: SavedAddress[] = Array.isArray(addresses)
          ? addresses
          : Array.isArray((addresses as any)?.data)
            ? (addresses as any).data
            : [];
        if (list.length === 0) {
          setDefaultAddress(null);
          return;
        }
        const def = list.find((a) => a.is_default) ?? list[0];
        setDefaultAddress(def);
      } catch {
        if (!cancelled) setDefaultAddress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOpts, signedIn]);

  const submitCartReview = useCallback(
    async ({ addressInline, shipping }: { addressInline: any; shipping?: ShippingChoice }) => {
      try {
        const created = await api.createOrder(apiOpts, {
          brand_slug: brandSlug,
          items,
          shipping,
        });
        const authed = await api.advanceAuth(apiOpts, created.id, { address_inline: addressInline });
        setOrder(authed);
        setStep("confirm");
      } catch (e: any) {
        setError(e?.message || "Could not create order");
      }
    },
    [apiOpts, brandSlug, items],
  );

  const proceedToPayment = useCallback(async () => {
    if (!order) return;
    try {
      const reviewed = await api.advanceReview(apiOpts, order.id);
      setOrder(reviewed);
      setStep("payment");
    } catch (e: any) {
      setError(e?.message || "Could not advance to payment");
    }
  }, [apiOpts, order]);

  const confirmPayment = useCallback(async () => {
    if (!order) return;
    setStep("processing");
    try {
      const paid = await api.confirmPayment(apiOpts, order.id);
      setOrder(paid);
      setStep("done");
    } catch (e: any) {
      setError(e?.message || "Could not confirm payment");
      setStep("payment");
    }
  }, [apiOpts, order]);

  const goTo = useCallback((s: FlowStep) => setStep(s), []);

  // Format price using brand locale.
  const formatPrice = useCallback((idr: number) => "Rp " + idr.toLocaleString("id-ID"), []);

  // ----- Pick mobile vs desktop shell -----
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const value: BeliAmanContextValue = {
    isOpen,
    step,
    brandTheme: config.brand,
    signedIn,
    email,
    displayName,
    photoUrl,
    order,
    brandSlug,
    items,
    paymentTab,
    paymentBank,
    setPaymentTab,
    setPaymentBank,
    open,
    close,
    goTo,
    startSignIn,
    signInIdentity,
    signOutIdentity,
    defaultAddress,
    submitCartReview,
    proceedToPayment,
    confirmPayment,
    resetFlow,
    apiOpts,
    formatPrice,
  };

  const Shell = isMobile ? MobileSheet : DesktopModal;

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen ? (
        <Shell onClose={close} title={titleForStep(step)}>
          {error ? (
            <div className="ba-error" role="alert">
              {error}
              <button className="ba-link" onClick={() => setError(null)}>
                tutup
              </button>
            </div>
          ) : null}
          {step === "sign-in" ? <StepSignIn /> : null}
          {step === "cart-review" ? <StepCartReview /> : null}
          {step === "confirm" ? <StepConfirm /> : null}
          {step === "payment" ? <StepPayment /> : null}
          {step === "processing" ? <StepProcessing /> : null}
          {step === "done" ? <StepDone /> : null}
        </Shell>
      ) : null}
    </Ctx.Provider>
  );
}

function titleForStep(s: FlowStep): string {
  switch (s) {
    case "sign-in":
      return "Beli Aman";
    case "cart-review":
      return "Tinjau Pesanan";
    case "confirm":
      return "Konfirmasi Pembayaran";
    case "payment":
      return "Pilih Metode Pembayaran";
    case "processing":
      return "Memproses...";
    case "done":
      return "Dana Anda Aman";
    default:
      return "Beli Aman";
  }
}

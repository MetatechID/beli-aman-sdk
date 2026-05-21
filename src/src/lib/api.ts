// Beli Aman BAP REST client. Adds Authorization: Bearer <id_token>; retries once on 401.

import { refreshIdToken, type FirebaseConfig } from "./firebase";

export interface ApiOptions {
  bapUrl: string;
  firebase: FirebaseConfig;
  getIdToken: () => Promise<string | null>;
}

export class ApiError extends Error {
  constructor(public status: number, public body: any, message?: string) {
    super(message || `Beli Aman API ${status}`);
  }
}

async function callOnce(opts: ApiOptions, path: string, init: RequestInit, token: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = opts.bapUrl.replace(/\/$/, "") + path;
  const res = await fetch(url, { ...init, headers });
  return res;
}

export async function call<T = any>(opts: ApiOptions, path: string, init: RequestInit = {}): Promise<T> {
  let token = await opts.getIdToken();
  let res = await callOnce(opts, path, init, token);

  if (res.status === 401) {
    // Try once with a forced-refreshed token.
    const fresh = await refreshIdToken(opts.firebase);
    if (fresh) {
      res = await callOnce(opts, path, init, fresh);
    }
  }

  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, body?.detail || res.statusText);
  }
  return body as T;
}

// ---- Typed wrappers ----

export interface ShippingChoice {
  courier_code: string;
  courier_service_code?: string;
  courier_service_name?: string;
  price_idr: number;
  duration?: string;
}

export interface CreateOrderRequest {
  brand_slug: string;
  items: { sku: string; qty: number }[];
  shipping?: ShippingChoice;
}

export interface ShippingRate {
  courier_code: string;
  courier_service_code: string;
  courier_service_name: string;
  duration: string;
  price: number;
}

export interface ShippingRatesRequest {
  brand_slug: string;
  destination_postal_code: string;
  items: { sku: string; qty: number }[];
}

export interface OrderResponse {
  id: string;
  state: string;
  total_idr: number;
  subtotal_idr: number;
  shipping_idr: number;
  fee_idr: number;
  items: any[];
  shipping_address?: any;
  payment_method_snapshot?: any;
  created_at: string;
  escrow_ledger?: { entry_type: string; amount_idr: number; description: string; created_at: string }[];
  shipped_simulated_at?: string | null;
  delivered_simulated_at?: string | null;
  auto_release_at?: string | null;
  released_at?: string | null;
}

export const api = {
  exchangeToken: (opts: ApiOptions) => call(opts, "/api/v1/auth/exchange", { method: "POST" }),
  me: (opts: ApiOptions) => call(opts, "/api/v1/me"),
  listAddresses: (opts: ApiOptions) => call(opts, "/api/v1/me/addresses"),
  createAddress: (opts: ApiOptions, body: any) =>
    call(opts, "/api/v1/me/addresses", { method: "POST", body: JSON.stringify(body) }),
  listPaymentMethods: (opts: ApiOptions) => call(opts, "/api/v1/me/payment-methods"),
  createOrder: (opts: ApiOptions, body: CreateOrderRequest) =>
    call<OrderResponse>(opts, "/api/v1/orders", { method: "POST", body: JSON.stringify(body) }),
  shippingRates: (opts: ApiOptions, body: ShippingRatesRequest) =>
    call<{ data: ShippingRate[] }>(opts, "/api/v1/shipping/rates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  advanceAuth: (opts: ApiOptions, orderId: string, body: { address_inline?: any; address_id?: string }) =>
    call<OrderResponse>(opts, `/api/v1/orders/${orderId}/auth`, { method: "PATCH", body: JSON.stringify(body) }),
  advanceReview: (opts: ApiOptions, orderId: string) =>
    call<OrderResponse>(opts, `/api/v1/orders/${orderId}/review`, { method: "PATCH", body: "{}" }),
  confirmPayment: (opts: ApiOptions, orderId: string) =>
    call<OrderResponse>(opts, `/api/v1/orders/${orderId}/confirm-payment`, { method: "POST", body: "{}" }),
  getOrder: (opts: ApiOptions, orderId: string) => call<OrderResponse>(opts, `/api/v1/orders/${orderId}`),
};

// Firebase web SDK init + Google sign-in helpers.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const APP_NAME = "beli-aman-sdk";

export function initFirebase(config: FirebaseConfig): FirebaseApp {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(config, APP_NAME);
}

export function getFirebaseAuth(config: FirebaseConfig) {
  const app = initFirebase(config);
  return getAuth(app);
}

export async function signInWithGoogle(config: FirebaseConfig): Promise<string> {
  const auth = getFirebaseAuth(config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return await result.user.getIdToken();
  } catch (err: any) {
    // Popup blocked / mobile Safari → fall back to redirect.
    if (
      err?.code === "auth/popup-blocked" ||
      err?.code === "auth/popup-closed-by-user" ||
      err?.code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
      // signInWithRedirect navigates away; this resolves on the redirect-callback page.
      throw new Error("REDIRECT_IN_PROGRESS");
    }
    throw err;
  }
}

export async function resolveRedirectSignIn(config: FirebaseConfig): Promise<string | null> {
  const auth = getFirebaseAuth(config);
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return await result.user.getIdToken();
}

export function watchUser(config: FirebaseConfig, cb: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth(config);
  return onAuthStateChanged(auth, cb);
}

export async function signOutCurrent(config: FirebaseConfig): Promise<void> {
  const auth = getFirebaseAuth(config);
  await signOut(auth);
}

export async function refreshIdToken(config: FirebaseConfig): Promise<string | null> {
  const auth = getFirebaseAuth(config);
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken(true);
}

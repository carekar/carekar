"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { CUSTOMER_EVENT, CUSTOMER_KEY } from "./firebase-keys";

// Customer sign-in (Google) with Firebase Auth. Only the login page and the booking
// review step import this file, so the Firebase SDK never loads on the rest of the site.
// The web config is public by design; access is controlled in the Firebase console
// (Authentication → Settings → Authorized domains).

const firebaseConfig = {
  apiKey: "AIzaSyCmXKuVbCWYuTERKVEV7fHEkUrRqXpgn2A",
  authDomain: "carekar-6ca30.firebaseapp.com",
  projectId: "carekar-6ca30",
  storageBucket: "carekar-6ca30.firebasestorage.app",
  messagingSenderId: "258346992317",
  appId: "1:258346992317:web:ec525e7004abad2bf9add4",
};

const auth = () => getAuth(getApps()[0] ?? initializeApp(firebaseConfig));

export type Customer = { uid: string; name?: string; email?: string; photo?: string };

const toCustomer = (u: User): Customer => ({
  uid: u.uid,
  name: u.displayName ?? undefined,
  email: u.email ?? undefined,
  photo: u.photoURL ?? undefined,
});

// The header shows "Hi, <name>" from this small copy, without loading Firebase.
function remember(c: Customer | null) {
  try {
    if (c) localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: c.name, email: c.email }));
    else localStorage.removeItem(CUSTOMER_KEY);
  } catch {}
  window.dispatchEvent(new Event(CUSTOMER_EVENT));
}

export function watchCustomer(cb: (c: Customer | null) => void) {
  return onAuthStateChanged(auth(), (u) => {
    const c = u ? toCustomer(u) : null;
    remember(c);
    cb(c);
  });
}

export async function signInWithGoogle(): Promise<Customer | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return toCustomer((await signInWithPopup(auth(), provider)).user);
  } catch (e) {
    // Some phone browsers block popups: fall back to a full-page redirect
    if ((e as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth(), provider);
      return null;
    }
    throw e;
  }
}

export const signOutCustomer = () => signOut(auth());

/** Short-lived token the API verifies before saving a booking. */
export const customerToken = () => auth().currentUser?.getIdToken() ?? Promise.resolve(undefined);

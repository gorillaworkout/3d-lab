"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseClientConfig, isFirebaseClientConfigured } from "@/lib/env-public";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseClientConfigured()) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseClientConfig());
    auth = getAuth(app);
  }
  return auth;
}

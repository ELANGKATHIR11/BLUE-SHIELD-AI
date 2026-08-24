/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's public Firebase configuration loaded securely from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBc2uadH4AA3Q5v9ooSAnhukZ2bUUoeLcI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "blue-shield-live-101.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "blue-shield-live-101",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "blue-shield-live-101.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "755727818787",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:755727818787:web:d8919a80b0becc77695196"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBc2uadH4AA3Q5v9ooSAnhukZ2bUUoeLcI",
  authDomain: "blue-shield-live-101.firebaseapp.com",
  projectId: "blue-shield-live-101",
  storageBucket: "blue-shield-live-101.firebasestorage.app",
  messagingSenderId: "755727818787",
  appId: "1:755727818787:web:d8919a80b0becc77695196"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyDMQwGkWQxfb5xrG_QKpG_Sl5rASNEZJ0Q");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export { app, analytics, auth, db, model };

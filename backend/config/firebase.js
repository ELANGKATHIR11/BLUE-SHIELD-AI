/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 *
 * OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
 * ============================================================================
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let db;
let auth;
let storage;
let isInitialized = false;

try {
  if (admin.apps.length === 0) {
    const serviceAccountKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${parsed.project_id}.appspot.com`
      });
      console.log('✅ Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (serviceAccountKeyPath && fs.existsSync(serviceAccountKeyPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKeyPath),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log(`✅ Firebase Admin initialized via service account file: ${serviceAccountKeyPath}`);
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
      console.log(`ℹ️ Firebase Admin initialized with project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      admin.initializeApp({
        projectId: 'blue-shield-live-101',
        storageBucket: 'blue-shield-live-101.firebasestorage.app'
      });
      console.log('ℹ️ Firebase Admin initialized with default project ID');
    }
  }

  db = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();
  isInitialized = true;
} catch (error) {
  console.error('⚠️ Firebase Admin Initialization Warning:', error.message);
  // Provide mock/in-memory fallback when offline for testing
  isInitialized = false;
}

export { admin, db, auth, storage, isInitialized };
export default { admin, db, auth, storage, isInitialized };

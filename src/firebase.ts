import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  databaseId?: string; // Support for named databases (e.g. if the user already has a database in their Firebase project)
}

const FIREBASE_STORAGE_KEY = 'mez_firebase_config_v1';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

import defaultFirebaseConfig from './firebase-config.json';

// Load saved config from localStorage, falling back to embedded config (for all public visitors)
export function getSavedFirebaseConfig(): FirebaseClientConfig | null {
  try {
    const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading saved Firebase config:', err);
  }

  // Fallback to embedded configuration (baked into build for public visitors)
  if (defaultFirebaseConfig && defaultFirebaseConfig.apiKey && defaultFirebaseConfig.projectId) {
    return defaultFirebaseConfig as FirebaseClientConfig;
  }

  // Fallback to Vite environment variables if available
  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      databaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || '(default)',
      appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || ''
    };
  }

  return null;
}

// Save config to localStorage
export function saveFirebaseConfigToLocal(config: FirebaseClientConfig): void {
  try {
    localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Error saving Firebase config:', err);
  }
}

// Clear saved config
export function clearSavedFirebaseConfig(): void {
  try {
    localStorage.removeItem(FIREBASE_STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing Firebase config:', err);
  }
}

// Initialize or update Firebase with user configuration
export async function initFirebaseService(config: FirebaseClientConfig): Promise<{ app: FirebaseApp; db: Firestore; auth: Auth } | null> {
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    // If an app was already initialized, re-use or re-initialize safely
    const existingApps = getApps();
    if (existingApps.length > 0) {
      for (const app of existingApps) {
        try {
          await deleteApp(app);
        } catch {
          // ignore
        }
      }
    }

    firebaseApp = initializeApp({
      apiKey: config.apiKey.trim(),
      authDomain: config.authDomain?.trim() || `${config.projectId.trim()}.firebaseapp.com`,
      projectId: config.projectId.trim(),
      storageBucket: config.storageBucket?.trim() || `${config.projectId.trim()}.appspot.com`,
      messagingSenderId: config.messagingSenderId?.trim(),
      appId: config.appId?.trim()
    });

    // Support optional custom named database (if user has multiple databases in their Google/Firebase project)
    const dbId = config.databaseId?.trim();
    if (dbId && dbId !== '(default)') {
      firestoreDb = getFirestore(firebaseApp, dbId);
    } else {
      firestoreDb = getFirestore(firebaseApp);
    }

    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
  } catch (err) {
    console.warn('Firebase init error:', err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return firestoreDb !== null && firebaseAuth !== null;
}

export function getActiveDb(): Firestore | null {
  return firestoreDb;
}

export function getActiveAuth(): Auth | null {
  return firebaseAuth;
}

// Admin Sign-In with Email and Password
export async function loginAdminEmail(email: string, pass: string): Promise<User> {
  if (!firebaseAuth) {
    throw new Error("Le service Firebase n'est pas encore initialisé. Veuillez renseigner votre configuration Firebase dans l'onglet 'Firebase Cloud'.");
  }
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  return credential.user;
}

// Admin Sign-Out
export async function logoutAdminEmail(): Promise<void> {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}

// Listen for admin auth state changes
export function subscribeAdminAuthState(callback: (user: User | null) => void): () => void {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

// Save page configuration to Firestore (collection: 'portal_config', document: 'settings')
// Protected by Firestore Rules so ONLY the authenticated admin can write
export async function savePageConfigToFirebase(configData: any): Promise<void> {
  if (!firestoreDb) {
    throw new Error("Base Firestore non connectée. Configurez d'abord vos clés de projet.");
  }

  const docRef = doc(firestoreDb, 'portal_config', 'settings');
  await setDoc(docRef, {
    ...configData,
    _lastUpdated: new Date().toISOString()
  });
}

// Load page configuration from Firestore (Public read for all visitors)
export async function loadPageConfigFromFirebase(): Promise<any | null> {
  if (!firestoreDb) return null;

  try {
    const docRef = doc(firestoreDb, 'portal_config', 'settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Erreur de lecture Firestore:', err);
  }
  return null;
}

// Real-time listener: when admin updates in Firebase, all visitors see it live!
export function subscribePageConfigFromFirebase(
  callback: (data: any) => void,
  onError?: (err: any) => void
): () => void {
  if (!firestoreDb) return () => {};

  try {
    const docRef = doc(firestoreDb, 'portal_config', 'settings');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      },
      (error) => {
        console.warn('Firestore snapshot error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Snapshot listener init failed:', err);
    return () => {};
  }
}

// Generate the exact Firestore Security Rules text for the user
export function generateFirestoreRules(adminEmail = 'mezitineraires@gmail.com'): string {
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Configuration publique de la page d'accueil (Portail Gravel)
    match /portal_config/settings {
      // 1. Lecture publique : Tous les visiteurs peuvent charger la page et voir les icônes
      allow read: if true;
      
      // 2. Écriture réservée à l'administrateur authentifié par email
      allow write: if request.auth != null 
                   && request.auth.token.email == "${adminEmail}";
    }
    
    // Règle par défaut pour le reste de la base (verrouillé)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;
}

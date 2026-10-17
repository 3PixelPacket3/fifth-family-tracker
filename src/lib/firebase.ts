import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  signOut,
  OAuthProvider,
} from "firebase/auth";
import type {
  Profile,
  TaxBracket,
  WeeklyContribution,
} from "@/store/useCartelStore";

// Your web app's live Firebase configuration (with environment variable override support)
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyDnPtLMh5xHsFTsJ_2qkHGPK7lCVPrwkhQ",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "vinciguerra-lupo-cartel.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vinciguerra-lupo-cartel",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "vinciguerra-lupo-cartel.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1040933479432",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1040933479432:web:acae84e953d46fb2771dbd",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XYMYDZCYV7",
};

export const isLiveFirebaseConfigured = true;

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Safely initialize Firebase Analytics in browser environments (prevents SSR/Static Export crash)
export const initFirebaseAnalytics = async () => {
  if (typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};

// 1. Google Sign-In (Popup)
export async function signInWithGoogleFirebase() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

// 2. Email & Password Sign-In
export async function loginWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// 3. Email & Password Account Registration
export async function registerWithEmailPassword(
  email: string,
  password: string
) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// 4. Passwordless Magic Link via Firebase Auth
export async function sendFirebaseMagicLink(email: string) {
  const actionCodeSettings = {
    url:
      typeof window !== "undefined"
        ? window.location.href
        : "http://localhost:3000",
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("cartelEmailForSignIn", email);
  }
}

// 5. Discord OIDC Sign-In
export async function signInWithDiscordFirebase() {
  const provider = new OAuthProvider("oidc.discord");
  return signInWithPopup(auth, provider);
}

// 6. Sign Out
export async function logoutFirebase() {
  return signOut(auth);
}

// 7. Seed or Sync Local Cartel State to Cloud Firestore Collections
export async function syncVaultToFirestore(payload: {
  profiles: Profile[];
  taxLogic: TaxBracket[];
  contributions: WeeklyContribution[];
  baseTreasury: number;
  activeWeekStart: string;
}) {
  const batch = writeBatch(db);

  // Collection: profiles
  payload.profiles.forEach((profile) => {
    const ref = doc(collection(db, "profiles"), profile.id);
    batch.set(ref, profile, { merge: true });
  });

  // Collection: tax_logic
  payload.taxLogic.forEach((tier) => {
    const ref = doc(collection(db, "tax_logic"), `level_${tier.min_level}`);
    batch.set(ref, tier, { merge: true });
  });

  // Collection: weekly_contributions
  payload.contributions.forEach((rec) => {
    const ref = doc(collection(db, "weekly_contributions"), rec.record_id);
    batch.set(ref, rec, { merge: true });
  });

  // Collection: cartel_treasury_meta
  const metaRef = doc(collection(db, "cartel_treasury_meta"), "singleton");
  batch.set(
    metaRef,
    {
      base_treasury_balance: payload.baseTreasury,
      active_week_start: payload.activeWeekStart,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function saveContributionToFirestore(rec: WeeklyContribution) {
  const ref = doc(collection(db, "weekly_contributions"), rec.record_id);
  await setDoc(ref, rec, { merge: true });
}

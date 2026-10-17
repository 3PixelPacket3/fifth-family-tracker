import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  signOut,
  User,
} from "firebase/auth";
import {
  MASTER_ADMIN_EMAIL,
  Profile,
  TaxBracket,
  WeeklyContribution,
  useCartelStore,
} from "@/store/useCartelStore";

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

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const initFirebaseAnalytics = async () => {
  if (typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};

// Check if email is the Master Admin (oharajoshua333@gmail.com)
export function isMasterAdminEmail(email?: string | null): boolean {
  return (
    Boolean(email) &&
    email!.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
  );
}

// Ensure a signed-in user has a profile document in Firestore & Local Store.
// - If email === oharajoshua333@gmail.com -> automatically approved Role='Admin', Rank='Don'
// - Otherwise -> created as approval_status='pending' so Master Admin or Don must approve before they can enter.
export async function ensureUserProfile(
  user: User,
  requestedGameName?: string,
  requestedLevel?: number
): Promise<Profile> {
  const isMaster = isMasterAdminEmail(user.email);
  const store = useCartelStore.getState();

  // Check local or cloud first
  let existing = store.profiles.find(
    (p) =>
      p.id === user.uid ||
      (user.email && p.email?.toLowerCase() === user.email.toLowerCase())
  );

  try {
    const docRef = doc(db, "profiles", user.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      existing = snap.data() as Profile;
    }
  } catch {
    // Fallback to local store if Firestore rules aren't published yet
  }

  if (existing) {
    // Upgrade master admin (App Developer) automatically if needed
    if (
      isMaster &&
      (existing.role !== "Admin" ||
        existing.approval_status !== "approved" ||
        existing.rank !== "App Developer")
    ) {
      const upgraded: Profile = {
        ...existing,
        rank: "App Developer",
        role: "Admin",
        approval_status: "approved",
        is_exempt: true,
      };
      await saveProfileToCloud(upgraded);
      return upgraded;
    }
    store.upsertProfileLocal(existing);
    return existing;
  }

  const fallbackName =
    requestedGameName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Operative";

  const newProfile: Profile = {
    id: user.uid,
    uid: user.uid,
    email: user.email || "",
    game_name: fallbackName,
    rank: isMaster ? "App Developer" : "Associate",
    level: requestedLevel && requestedLevel >= 1 ? requestedLevel : 1,
    role: isMaster ? "Admin" : "User",
    approval_status: isMaster ? "approved" : "pending",
    is_exempt: isMaster ? true : false,
    joined_at: new Date().toISOString().slice(0, 10),
  };

  await saveProfileToCloud(newProfile);
  return newProfile;
}

// Save or Update a Profile in both Local Store and Cloud Firestore
export async function saveProfileToCloud(profile: Profile) {
  useCartelStore.getState().upsertProfileLocal(profile);
  try {
    await setDoc(doc(db, "profiles", profile.id), profile, { merge: true });
  } catch {
    // Local store keeps working seamlessly
  }
}

// Delete a Profile from both Local Store and Cloud Firestore
export async function deleteProfileFromCloud(profileId: string) {
  useCartelStore.getState().removeProfileLocal(profileId);
  try {
    await deleteDoc(doc(db, "profiles", profileId));
  } catch {
    // Ignored if offline
  }
}

// Save a Weekly Contribution payment in both Local Store and Cloud Firestore
export async function saveContributionToCloud(rec: WeeklyContribution) {
  try {
    await setDoc(doc(db, "weekly_contributions", rec.record_id), rec, {
      merge: true,
    });
  } catch {
    // Local store already updated
  }
}

// Save Metadata (Treasury balance, Active Week, Custom Welcome HTML)
export async function saveMetaToCloud(meta: {
  baseTreasury?: number;
  activeWeekStart?: string;
  welcomeHtml?: string;
}) {
  const store = useCartelStore.getState();
  if (meta.baseTreasury !== undefined) store.setBaseTreasury(meta.baseTreasury);
  if (meta.activeWeekStart !== undefined)
    store.setActiveWeekStart(meta.activeWeekStart);
  if (meta.welcomeHtml !== undefined) store.setWelcomeHtml(meta.welcomeHtml);

  try {
    await setDoc(
      doc(db, "cartel_treasury_meta", "singleton"),
      {
        base_treasury_balance:
          meta.baseTreasury ?? useCartelStore.getState().baseTreasury,
        active_week_start:
          meta.activeWeekStart ?? useCartelStore.getState().activeWeekStart,
        welcome_html: meta.welcomeHtml ?? useCartelStore.getState().welcomeHtml,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Local store already updated
  }
}

// Save Tax Bracket to Cloud Firestore
export async function saveTaxBracketToCloud(tier: TaxBracket) {
  useCartelStore
    .getState()
    .updateTaxBracketLocal(
      tier.min_level,
      tier.expected_tax,
      tier.bracket_label
    );
  try {
    await setDoc(doc(db, "tax_logic", `level_${tier.min_level}`), tier, {
      merge: true,
    });
  } catch {
    // Local store already updated
  }
}

// Subscribe to live Cloud Firestore collections when an approved user or Admin is signed in
export function subscribeToCartelFirestore(): () => void {
  const unsubs: Array<() => void> = [];

  try {
    const unsubProfiles = onSnapshot(
      collection(db, "profiles"),
      (snap) => {
        if (!snap.empty) {
          const list: Profile[] = [];
          snap.forEach((d) => list.push(d.data() as Profile));
          useCartelStore.getState().setCloudState({ profiles: list });
        }
      },
      () => {}
    );
    unsubs.push(unsubProfiles);

    const unsubContribs = onSnapshot(
      collection(db, "weekly_contributions"),
      (snap) => {
        if (!snap.empty) {
          const list: WeeklyContribution[] = [];
          snap.forEach((d) => list.push(d.data() as WeeklyContribution));
          useCartelStore.getState().setCloudState({ contributions: list });
        }
      },
      () => {}
    );
    unsubs.push(unsubContribs);

    const unsubMeta = onSnapshot(
      doc(db, "cartel_treasury_meta", "singleton"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          useCartelStore.getState().setCloudState({
            baseTreasury:
              typeof data.base_treasury_balance === "number"
                ? data.base_treasury_balance
                : 0,
            activeWeekStart:
              data.active_week_start ||
              useCartelStore.getState().activeWeekStart,
            welcomeHtml:
              data.welcome_html ?? useCartelStore.getState().welcomeHtml,
          });
        }
      },
      () => {}
    );
    unsubs.push(unsubMeta);
  } catch {
    // Ignore if Firestore offline
  }

  return () => unsubs.forEach((u) => u());
}

// Auth Wrappers
export async function signInWithGoogleFirebase() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function loginWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmailPassword(
  email: string,
  password: string
) {
  return createUserWithEmailAndPassword(auth, email, password);
}

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

export async function logoutFirebase() {
  return signOut(auth);
}

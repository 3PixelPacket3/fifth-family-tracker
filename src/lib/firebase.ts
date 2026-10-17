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
  DEFAULT_DON_EMAIL,
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

// Check if email is the App Developer (oharajoshua333@gmail.com)
export function isMasterAdminEmail(email?: string | null): boolean {
  return (
    Boolean(email) &&
    email!.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
  );
}

// Check if email is the Default Family Don (zpenrice@gmail.com)
export function isDefaultDonEmail(email?: string | null): boolean {
  return (
    Boolean(email) &&
    email!.trim().toLowerCase() === DEFAULT_DON_EMAIL.toLowerCase()
  );
}

// Ensure a signed-in user has a profile document in Firestore & Local Store.
// - oharajoshua333@gmail.com -> automatically approved Role='Admin', Rank='App Developer'
// - zpenrice@gmail.com -> automatically approved Role='Admin', Rank='Don' (whether signing in via Google or Email/Password)
// - All other accounts -> created as approval_status='pending'
export async function ensureUserProfile(
  user: User,
  requestedGameName?: string,
  requestedLevel?: number
): Promise<Profile> {
  const isMaster = isMasterAdminEmail(user.email);
  const isDefaultDon = isDefaultDonEmail(user.email);
  const store = useCartelStore.getState();

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
    // Fallback to local store if offline
  }

  if (existing) {
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

    if (
      isDefaultDon &&
      (existing.role !== "Admin" ||
        existing.approval_status !== "approved" ||
        existing.rank !== "Don")
    ) {
      const upgradedDon: Profile = {
        ...existing,
        rank: "Don",
        role: "Admin",
        approval_status: "approved",
      };
      await saveProfileToCloud(upgradedDon);
      return upgradedDon;
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
    rank: isMaster ? "App Developer" : isDefaultDon ? "Don" : "Associate",
    level: requestedLevel && requestedLevel >= 1 ? requestedLevel : 1,
    role: isMaster || isDefaultDon ? "Admin" : "User",
    approval_status: isMaster || isDefaultDon ? "approved" : "pending",
    is_exempt: isMaster ? true : false,
    joined_at: new Date().toISOString().slice(0, 10),
  };

  await saveProfileToCloud(newProfile);
  return newProfile;
}

export async function saveProfileToCloud(profile: Profile) {
  useCartelStore.getState().upsertProfileLocal(profile);
  try {
    await setDoc(doc(db, "profiles", profile.id), profile, { merge: true });
  } catch {
    // Local store keeps working seamlessly
  }
}

export async function deleteProfileFromCloud(profileId: string) {
  useCartelStore.getState().removeProfileLocal(profileId);
  try {
    await deleteDoc(doc(db, "profiles", profileId));
  } catch {
    // Ignored if offline
  }
}

export async function saveContributionToCloud(rec: WeeklyContribution) {
  try {
    await setDoc(doc(db, "weekly_contributions", rec.record_id), rec, {
      merge: true,
    });
  } catch {
    // Local store already updated
  }
}

export async function saveMetaToCloud(meta: {
  baseTreasury?: number;
  activeWeekStart?: string;
  welcomeHtml?: string;
  rankPermissions?: import("@/store/useCartelStore").RankPermissionsMap;
}) {
  const store = useCartelStore.getState();
  if (meta.baseTreasury !== undefined) store.setBaseTreasury(meta.baseTreasury);
  if (meta.activeWeekStart !== undefined)
    store.setActiveWeekStart(meta.activeWeekStart);
  if (meta.welcomeHtml !== undefined) store.setWelcomeHtml(meta.welcomeHtml);
  if (meta.rankPermissions !== undefined)
    store.setRankPermissionsLocal(meta.rankPermissions);

  try {
    await setDoc(
      doc(db, "cartel_treasury_meta", "singleton"),
      {
        base_treasury_balance:
          meta.baseTreasury ?? useCartelStore.getState().baseTreasury,
        active_week_start:
          meta.activeWeekStart ?? useCartelStore.getState().activeWeekStart,
        welcome_html: meta.welcomeHtml ?? useCartelStore.getState().welcomeHtml,
        rank_permissions:
          meta.rankPermissions ?? useCartelStore.getState().rankPermissions,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Local store already updated
  }
}

// Save or Update a Tax Bracket in both Local Store and Cloud Firestore
export async function saveTaxBracketToCloud(
  tier: TaxBracket,
  previousMinLevel?: number
) {
  useCartelStore
    .getState()
    .updateTaxBracketLocal(
      tier.min_level,
      tier.expected_tax,
      tier.bracket_label,
      previousMinLevel
    );
  try {
    if (
      previousMinLevel !== undefined &&
      previousMinLevel !== tier.min_level
    ) {
      await deleteDoc(doc(db, "tax_logic", `level_${previousMinLevel}`));
    }
    await setDoc(doc(db, "tax_logic", `level_${tier.min_level}`), tier, {
      merge: true,
    });
  } catch {
    // Local store already updated
  }
}

// Delete a Tax Bracket from both Local Store and Cloud Firestore
export async function deleteTaxBracketFromCloud(minLevel: number) {
  useCartelStore.getState().removeTaxBracketLocal(minLevel);
  try {
    await deleteDoc(doc(db, "tax_logic", `level_${minLevel}`));
  } catch {
    // Local store already updated
  }
}

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

    const unsubTax = onSnapshot(
      collection(db, "tax_logic"),
      (snap) => {
        if (!snap.empty) {
          const list: TaxBracket[] = [];
          snap.forEach((d) => list.push(d.data() as TaxBracket));
          list.sort((a, b) => a.min_level - b.min_level);
          useCartelStore.getState().setCloudState({ taxLogic: list });
        }
      },
      () => {}
    );
    unsubs.push(unsubTax);

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
            rankPermissions:
              data.rank_permissions ??
              useCartelStore.getState().rankPermissions,
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

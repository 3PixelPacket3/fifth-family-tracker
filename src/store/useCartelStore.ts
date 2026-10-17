import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MASTER_ADMIN_EMAIL = "oharajoshua333@gmail.com";

export type MemberRank = "Don" | "Underboss" | "Capo" | "Soldier" | "Associate";
export type AppRole = "Admin" | "User";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ContributionStatus = "Pending" | "Complete";

export interface Profile {
  id: string;
  uid?: string; // Firebase Auth UID if registered via login screen
  email?: string;
  game_name: string;
  rank: MemberRank;
  level: number;
  custom_tax_override?: number | null; // Optional per-member custom tax set by Admin/Don
  role: AppRole;
  approval_status: ApprovalStatus;
  is_exempt?: boolean;
  joined_at: string;
}

export interface TaxBracket {
  min_level: number;
  expected_tax: number;
  bracket_label: string;
}

export interface WeeklyContribution {
  record_id: string;
  player_id: string;
  week_start_date: string; // YYYY-MM-DD
  amount_paid: number;
  status: ContributionStatus;
  receipt_note?: string;
  updated_at: string;
}

// Default Tax Logic Table (Level -> Expected Tax from Spec)
export const DEFAULT_TAX_LOGIC: TaxBracket[] = [
  { min_level: 1, expected_tax: 0, bracket_label: "Initiate (Lv 1–39)" },
  { min_level: 40, expected_tax: 2_000_000, bracket_label: "Lv 40+ ($2M)" },
  { min_level: 50, expected_tax: 4_000_000, bracket_label: "Lv 50+ ($4M)" },
  { min_level: 60, expected_tax: 7_000_000, bracket_label: "Lv 60+ ($7M)" },
  { min_level: 140, expected_tax: 86_000_000, bracket_label: "Lv 140+ ($86M)" },
];

export const DEFAULT_WELCOME_HTML = `<div style="padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#141722 0%,#1d1520 100%);border:1px solid rgba(212,175,55,0.45);color:#f8fafc;font-family:system-ui,sans-serif;"><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#d4af37;font-weight:700;margin-bottom:4px;">VINCIGUERRA LUPO SYNDICATE</div><div style="font-size:15px;font-weight:800;color:#ffffff;margin-bottom:4px;">Welcome to The Fifth Family Command Ledger</div><div style="font-size:12px;color:#cbd5e1;line-height:1.45;">All family tributes are logged weekly before Sunday Rollover. Contact the Don or Admin for rank promotions or tax adjustments.</div></div>`;

export function getCurrentSundayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

export function calculateMemberExpectedTax(
  member: Pick<Profile, "level" | "is_exempt" | "custom_tax_override">,
  brackets: TaxBracket[]
): { expected_tax: number; bracket_label: string } {
  if (member.is_exempt) {
    return { expected_tax: 0, bracket_label: "Exempt" };
  }
  if (
    typeof member.custom_tax_override === "number" &&
    member.custom_tax_override >= 0
  ) {
    return {
      expected_tax: member.custom_tax_override,
      bracket_label: "Custom Admin Tax",
    };
  }
  const sorted = [...brackets].sort((a, b) => b.min_level - a.min_level);
  const match = sorted.find((b) => member.level >= b.min_level);
  return (
    match || { min_level: 1, expected_tax: 0, bracket_label: "Lv 1+ ($0)" }
  );
}

export function formatCartelCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CartelState {
  // Fresh state — ZERO pre-populated demo members or fake payments
  profiles: Profile[];
  taxLogic: TaxBracket[];
  contributions: WeeklyContribution[];
  activeWeekStart: string;
  baseTreasury: number;
  welcomeHtml: string;

  // Hydrate from Cloud Firestore realtime listener
  setCloudState: (partial: Partial<CartelState>) => void;

  // Member & Approval Actions
  upsertProfileLocal: (profile: Profile) => void;
  removeProfileLocal: (profileId: string) => void;
  setActiveWeekStart: (weekStart: string) => void;
  setBaseTreasury: (amount: number) => void;
  setWelcomeHtml: (html: string) => void;
  logPaymentLocal: (
    playerId: string,
    amount: number,
    note?: string,
    mode?: "add" | "set"
  ) => WeeklyContribution | null;
  toggleMemberPaidLocal: (
    playerId: string,
    weekStart?: string
  ) => WeeklyContribution | null;
  updateTaxBracketLocal: (
    minLevel: number,
    expectedTax: number,
    label: string
  ) => void;
  removeTaxBracketLocal: (minLevel: number) => void;
}

export const useCartelStore = create<CartelState>()(
  persist(
    (set, get) => ({
      profiles: [], // Strictly fresh account: no pre-populated demo roster
      taxLogic: DEFAULT_TAX_LOGIC,
      contributions: [], // Strictly fresh account: no pre-populated demo payments
      activeWeekStart: getCurrentSundayISO(),
      baseTreasury: 0,
      welcomeHtml: DEFAULT_WELCOME_HTML,

      setCloudState: (partial) => set((state) => ({ ...state, ...partial })),

      upsertProfileLocal: (profile) =>
        set((state) => {
          const exists = state.profiles.some((p) => p.id === profile.id);
          return {
            profiles: exists
              ? state.profiles.map((p) => (p.id === profile.id ? profile : p))
              : [...state.profiles, profile],
          };
        }),

      removeProfileLocal: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== profileId),
          contributions: state.contributions.filter(
            (c) => c.player_id !== profileId
          ),
        })),

      setActiveWeekStart: (weekStart) => set({ activeWeekStart: weekStart }),

      setBaseTreasury: (amount) => set({ baseTreasury: Math.max(0, amount) }),

      setWelcomeHtml: (html) => set({ welcomeHtml: html }),

      logPaymentLocal: (playerId, amount, note, mode = "add") => {
        const state = get();
        const member = state.profiles.find((p) => p.id === playerId);
        if (!member) return null;

        const { expected_tax } = calculateMemberExpectedTax(
          member,
          state.taxLogic
        );
        const existingIdx = state.contributions.findIndex(
          (c) =>
            c.player_id === playerId &&
            c.week_start_date === state.activeWeekStart
        );

        const updated = [...state.contributions];
        let delta = 0;
        let savedRecord: WeeklyContribution;

        if (existingIdx >= 0) {
          const cur = updated[existingIdx];
          const nextAmount =
            mode === "add" ? cur.amount_paid + amount : Math.max(0, amount);
          delta = nextAmount - cur.amount_paid;
          savedRecord = {
            ...cur,
            amount_paid: nextAmount,
            status: nextAmount >= expected_tax ? "Complete" : "Pending",
            receipt_note: note ?? cur.receipt_note,
            updated_at: new Date().toISOString(),
          };
          updated[existingIdx] = savedRecord;
        } else {
          const nextAmount = Math.max(0, amount);
          delta = nextAmount;
          savedRecord = {
            record_id: `wc_${state.activeWeekStart}_${playerId}`,
            player_id: playerId,
            week_start_date: state.activeWeekStart,
            amount_paid: nextAmount,
            status: nextAmount >= expected_tax ? "Complete" : "Pending",
            receipt_note: note || "Payment logged",
            updated_at: new Date().toISOString(),
          };
          updated.push(savedRecord);
        }

        set({
          contributions: updated,
          baseTreasury: Math.max(0, state.baseTreasury + delta),
        });

        return savedRecord;
      },

      toggleMemberPaidLocal: (playerId, weekStart) => {
        const state = get();
        const targetWeek = weekStart || state.activeWeekStart;
        const member = state.profiles.find((p) => p.id === playerId);
        if (!member) return null;

        const { expected_tax } = calculateMemberExpectedTax(
          member,
          state.taxLogic
        );
        const idx = state.contributions.findIndex(
          (c) => c.player_id === playerId && c.week_start_date === targetWeek
        );

        const updated = [...state.contributions];
        let delta = 0;
        let savedRecord: WeeklyContribution;

        if (idx >= 0) {
          const rec = updated[idx];
          if (rec.status === "Complete") {
            delta = -rec.amount_paid;
            savedRecord = {
              ...rec,
              amount_paid: 0,
              status: "Pending",
              updated_at: new Date().toISOString(),
            };
          } else {
            delta = expected_tax - rec.amount_paid;
            savedRecord = {
              ...rec,
              amount_paid: expected_tax,
              status: "Complete",
              receipt_note: rec.receipt_note || "Marked Paid by Admin",
              updated_at: new Date().toISOString(),
            };
          }
          updated[idx] = savedRecord;
        } else {
          delta = expected_tax;
          savedRecord = {
            record_id: `wc_${targetWeek}_${playerId}`,
            player_id: playerId,
            week_start_date: targetWeek,
            amount_paid: expected_tax,
            status: "Complete",
            receipt_note: "Marked Paid by Admin",
            updated_at: new Date().toISOString(),
          };
          updated.push(savedRecord);
        }

        set({
          contributions: updated,
          baseTreasury: Math.max(0, state.baseTreasury + delta),
        });

        return savedRecord;
      },

      updateTaxBracketLocal: (minLevel, expectedTax, label) => {
        const state = get();
        const exists = state.taxLogic.some((b) => b.min_level === minLevel);
        const nextLogic = exists
          ? state.taxLogic.map((b) =>
              b.min_level === minLevel
                ? {
                    min_level: minLevel,
                    expected_tax: expectedTax,
                    bracket_label: label,
                  }
                : b
            )
          : [
              ...state.taxLogic,
              {
                min_level: minLevel,
                expected_tax: expectedTax,
                bracket_label: label,
              },
            ].sort((a, b) => a.min_level - b.min_level);

        set({ taxLogic: nextLogic });
      },

      removeTaxBracketLocal: (minLevel) => {
        if (minLevel === 1) return;
        set((state) => ({
          taxLogic: state.taxLogic.filter((b) => b.min_level !== minLevel),
        }));
      },
    }),
    {
      name: "vinciguerra-lupo-clean-vault-v2",
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MASTER_ADMIN_EMAIL = "oharajoshua333@gmail.com";
export const DEFAULT_DON_EMAIL = "zpenrice@gmail.com";
export const APP_VERSION = "1.0.0";

export type MemberRank =
  | "App Developer"
  | "Don"
  | "Underboss"
  | "Capo"
  | "Soldier"
  | "Associate";
export type ConfigurableRank = "Underboss" | "Capo" | "Soldier" | "Associate";
export type AppRole = "Admin" | "User";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ContributionStatus = "Pending" | "Complete";

export interface RankPermissionSet {
  manageMembers: boolean;
  manageRolloverTreasury: boolean;
  manageTaxBrackets: boolean;
  manageIndividualTax: boolean;
}

export type RankPermissionsMap = Record<ConfigurableRank, RankPermissionSet>;

export const DEFAULT_RANK_PERMISSIONS: RankPermissionsMap = {
  Underboss: {
    manageMembers: true,
    manageRolloverTreasury: false,
    manageTaxBrackets: false,
    manageIndividualTax: true,
  },
  Capo: {
    manageMembers: false,
    manageRolloverTreasury: false,
    manageTaxBrackets: false,
    manageIndividualTax: false,
  },
  Soldier: {
    manageMembers: false,
    manageRolloverTreasury: false,
    manageTaxBrackets: false,
    manageIndividualTax: false,
  },
  Associate: {
    manageMembers: false,
    manageRolloverTreasury: false,
    manageTaxBrackets: false,
    manageIndividualTax: false,
  },
};

export interface Profile {
  id: string;
  uid?: string;
  email?: string;
  game_name: string;
  rank: MemberRank;
  level: number;
  custom_tax_override?: number | null;
  linked_member_id?: string | null;
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
  week_start_date: string;
  amount_paid: number;
  status: ContributionStatus;
  receipt_note?: string;
  updated_at: string;
}

export const DEFAULT_TAX_LOGIC: TaxBracket[] = [
  { min_level: 1, expected_tax: 0, bracket_label: "Lv 1–39 ($0)" },
  { min_level: 40, expected_tax: 2_000_000, bracket_label: "Lv 40+ ($2M)" },
  { min_level: 50, expected_tax: 4_000_000, bracket_label: "Lv 50+ ($4M)" },
  { min_level: 60, expected_tax: 7_000_000, bracket_label: "Lv 60+ ($7M)" },
  { min_level: 140, expected_tax: 86_000_000, bracket_label: "Lv 140+ ($86M)" },
];

export const DEFAULT_WELCOME_HTML = `<div style="padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#141722 0%,#1d1520 100%);border:1px solid rgba(212,175,55,0.45);color:#f8fafc;font-family:system-ui,sans-serif;"><div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#d4af37;font-weight:700;margin-bottom:4px;">VINCIGUERRA LUPO SYNDICATE</div><div style="font-size:15px;font-weight:800;color:#ffffff;margin-bottom:4px;">Welcome to the Lupo Family Command Ledger</div><div style="font-size:12px;color:#cbd5e1;line-height:1.45;">All family tributes are logged weekly before Sunday Rollover. Contact the Don or App Developer for rank promotions or tax adjustments.</div></div>`;

export function getCurrentSundayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

export function getEffectivePermissions(
  rank: MemberRank,
  isMasterAdmin: boolean,
  isDefaultDon: boolean,
  rankPermissions: RankPermissionsMap
): RankPermissionSet & { isFullCommand: boolean } {
  if (
    isMasterAdmin ||
    isDefaultDon ||
    rank === "App Developer" ||
    rank === "Don"
  ) {
    return {
      isFullCommand: true,
      manageMembers: true,
      manageRolloverTreasury: true,
      manageTaxBrackets: true,
      manageIndividualTax: true,
    };
  }
  const perms = rankPermissions[rank as ConfigurableRank] || {
    manageMembers: false,
    manageRolloverTreasury: false,
    manageTaxBrackets: false,
    manageIndividualTax: false,
  };
  return {
    isFullCommand: false,
    ...perms,
  };
}

export function calculateMemberExpectedTax(
  member: Pick<Profile, "level" | "is_exempt" | "custom_tax_override" | "rank">,
  brackets: TaxBracket[]
): { expected_tax: number; bracket_label: string } {
  if (member.is_exempt || member.rank === "App Developer") {
    return { expected_tax: 0, bracket_label: "Exempt" };
  }
  if (
    typeof member.custom_tax_override === "number" &&
    member.custom_tax_override >= 0
  ) {
    return {
      expected_tax: member.custom_tax_override,
      bracket_label: "Custom Assigned Tax",
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
  profiles: Profile[];
  taxLogic: TaxBracket[];
  contributions: WeeklyContribution[];
  activeWeekStart: string;
  baseTreasury: number;
  welcomeHtml: string;
  rankPermissions: RankPermissionsMap;

  setCloudState: (partial: Partial<CartelState>) => void;
  upsertProfileLocal: (profile: Profile) => void;
  removeProfileLocal: (profileId: string) => void;
  setActiveWeekStart: (weekStart: string) => void;
  setBaseTreasury: (amount: number) => void;
  setWelcomeHtml: (html: string) => void;
  setRankPermissionsLocal: (perms: RankPermissionsMap) => void;
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
    label: string,
    previousMinLevel?: number
  ) => void;
  removeTaxBracketLocal: (minLevel: number) => void;
}

export const useCartelStore = create<CartelState>()(
  persist(
    (set, get) => ({
      profiles: [],
      taxLogic: DEFAULT_TAX_LOGIC,
      contributions: [],
      activeWeekStart: getCurrentSundayISO(),
      baseTreasury: 0,
      welcomeHtml: DEFAULT_WELCOME_HTML,
      rankPermissions: DEFAULT_RANK_PERMISSIONS,

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

      setRankPermissionsLocal: (perms) => set({ rankPermissions: perms }),

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
              receipt_note: rec.receipt_note || "Marked Paid",
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
            receipt_note: "Marked Paid",
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

      updateTaxBracketLocal: (
        minLevel,
        expectedTax,
        label,
        previousMinLevel
      ) => {
        const state = get();
        let filtered = state.taxLogic;
        if (
          previousMinLevel !== undefined &&
          previousMinLevel !== minLevel
        ) {
          filtered = filtered.filter((b) => b.min_level !== previousMinLevel);
        }
        const exists = filtered.some((b) => b.min_level === minLevel);
        const nextLogic = exists
          ? filtered
              .map((b) =>
                b.min_level === minLevel
                  ? {
                      min_level: minLevel,
                      expected_tax: expectedTax,
                      bracket_label: label,
                    }
                  : b
              )
              .sort((a, b) => a.min_level - b.min_level)
          : [
              ...filtered,
              {
                min_level: minLevel,
                expected_tax: expectedTax,
                bracket_label: label,
              },
            ].sort((a, b) => a.min_level - b.min_level);

        set({ taxLogic: nextLogic });
      },

      removeTaxBracketLocal: (minLevel) => {
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

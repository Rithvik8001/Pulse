import {
  BookOpenText,
  ChartLine,
  ChatCircleText,
  Fingerprint,
  GearSix,
  House,
  Lightbulb,
  ListChecks,
  Notebook,
  SealCheck,
  Target,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";

import type { IconComponent } from "@/components/ui/icon";

/**
 * One tint per feature, used everywhere the feature appears.
 * Class strings are literal so Tailwind can see them.
 */
export type Tint =
  | "neutral"
  | "violet"
  | "blue"
  | "orange"
  | "red"
  | "green"
  | "pink"
  | "amber"
  | "cyan"
  | "indigo";

export const tintClassName: Record<Tint, string> = {
  neutral: "bg-fill-2 text-fg-2",
  violet: "bg-t-violet-bg text-t-violet",
  blue: "bg-t-blue-bg text-t-blue",
  orange: "bg-t-orange-bg text-t-orange",
  red: "bg-t-red-bg text-t-red",
  green: "bg-t-green-bg text-t-green",
  pink: "bg-t-pink-bg text-t-pink",
  amber: "bg-t-amber-bg text-t-amber",
  cyan: "bg-t-cyan-bg text-t-cyan",
  indigo: "bg-t-indigo-bg text-t-indigo",
};

export type Feature =
  | "today"
  | "quests"
  | "proof"
  | "stats"
  | "identity"
  | "journal"
  | "story"
  | "coach"
  | "habits"
  | "suggestions"
  | "momentum"
  | "settings";

export const features: Record<
  Feature,
  { label: string; tint: Tint; icon: IconComponent; href: string }
> = {
  today: { label: "Today", tint: "neutral", icon: House, href: "/dashboard" },
  quests: { label: "Quests", tint: "orange", icon: Target, href: "/dashboard/quests" },
  proof: { label: "Proof", tint: "green", icon: SealCheck, href: "/dashboard/proof" },
  stats: { label: "Stats", tint: "blue", icon: ChartLine, href: "/dashboard/stats" },
  identity: { label: "Identity", tint: "violet", icon: Fingerprint, href: "/dashboard/identity" },
  journal: { label: "Journal", tint: "amber", icon: Notebook, href: "/dashboard/journal" },
  story: { label: "Story", tint: "pink", icon: BookOpenText, href: "/dashboard/story" },
  coach: { label: "Coach", tint: "cyan", icon: ChatCircleText, href: "/dashboard" },
  habits: { label: "Habit agent", tint: "indigo", icon: ListChecks, href: "/dashboard" },
  suggestions: { label: "Suggestions", tint: "indigo", icon: Lightbulb, href: "/dashboard" },
  momentum: { label: "Momentum", tint: "red", icon: TrendUp, href: "/dashboard/stats" },
  settings: { label: "Settings", tint: "neutral", icon: GearSix, href: "/dashboard/settings" },
};

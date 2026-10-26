import {
  BookOpenText,
  GearSix,
  House,
  Lightbulb,
  Notebook,
  SealCheck,
  Sparkle,
  Target,
} from "@phosphor-icons/react/dist/ssr";

import type { IconComponent } from "@/components/ui/icon";

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
  | "habits"
  | "history"
  | "review"
  | "journal"
  | "assistant"
  | "suggestions"
  | "settings";

export const features: Record<
  Feature,
  { label: string; tint: Tint; icon: IconComponent; href: string }
> = {
  today: { label: "Today", tint: "neutral", icon: House, href: "/dashboard" },
  habits: { label: "Habits", tint: "orange", icon: Target, href: "/dashboard/habits" },
  history: { label: "History", tint: "green", icon: SealCheck, href: "/dashboard/history" },
  review: { label: "Review", tint: "violet", icon: BookOpenText, href: "/dashboard/review" },
  journal: { label: "Journal", tint: "amber", icon: Notebook, href: "/dashboard/journal" },
  assistant: { label: "Assistant", tint: "cyan", icon: Sparkle, href: "/dashboard" },
  suggestions: { label: "Suggestions", tint: "indigo", icon: Lightbulb, href: "/dashboard/habits" },
  settings: { label: "Settings", tint: "neutral", icon: GearSix, href: "/dashboard/settings" },
};

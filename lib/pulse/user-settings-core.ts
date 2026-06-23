export const defaultTimeZone = "UTC";
export const defaultLocale = "en";

export type UserSettingsInput = {
  timeZone?: string | null;
  locale?: string | null;
};

export type NormalizedUserSettings = {
  timeZone: string;
  locale: string;
};

export function isValidTimeZone(value: string) {
  if (!value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: string | null | undefined) {
  const timeZone = typeof value === "string" ? value.trim() : "";

  return isValidTimeZone(timeZone) ? timeZone : defaultTimeZone;
}

export function normalizeLocale(value: string | null | undefined) {
  const locale = typeof value === "string" ? value.trim() : "";

  if (!locale) {
    return defaultLocale;
  }

  try {
    return Intl.getCanonicalLocales(locale)[0] ?? defaultLocale;
  } catch {
    return defaultLocale;
  }
}

export function normalizeUserSettings(
  input: UserSettingsInput,
): NormalizedUserSettings {
  return {
    timeZone: normalizeTimeZone(input.timeZone),
    locale: normalizeLocale(input.locale),
  };
}

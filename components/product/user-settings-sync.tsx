"use client";

import { useEffect } from "react";

import { syncUserSettingsAction } from "@/app/dashboard/settings/actions";

type UserSettingsSyncProps = {
  locale: string;
  timeZone: string;
};

export function UserSettingsSync({
  locale,
  timeZone,
}: UserSettingsSyncProps) {
  useEffect(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    const browserTimeZone = resolved.timeZone;
    const browserLocale = navigator.language || resolved.locale;

    if (!browserTimeZone || !browserLocale) {
      return;
    }

    if (browserTimeZone === timeZone && browserLocale === locale) {
      return;
    }

    void syncUserSettingsAction({
      locale: browserLocale,
      timeZone: browserTimeZone,
    });
  }, [locale, timeZone]);

  return null;
}

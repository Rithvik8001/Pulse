"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { syncUserSettingsAction } from "@/app/dashboard/settings/actions";

type UserSettingsSyncProps = {
  locale: string;
  timeZone: string;
};

export function UserSettingsSync({
  locale,
  timeZone,
}: UserSettingsSyncProps) {
  const router = useRouter();
  const refreshedRef = useRef(false);

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
    }).then((result) => {
      if (result.status === "success" && browserTimeZone !== timeZone && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    });
  }, [locale, router, timeZone]);

  return null;
}

"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { IconButton } from "@/components/ui/icon-button";
import { formatLocalDate, parseLocalDate } from "@/lib/pulse/local-date-core";
import { cn } from "@/lib/utils";

export type CalendarProps = {
  value?: string;
  onChange?: (localDate: string) => void;

  today?: string;
  min?: string;
  max?: string;

  marked?: Iterable<string>;
  locale?: string;

  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;

  autoFocus?: boolean;
};

function monthKey(localDate: string) {
  return localDate.slice(0, 7);
}

function firstOfMonth(key: string) {
  return parseLocalDate(`${key}-01`);
}

function shiftMonth(key: string, by: number) {
  const date = firstOfMonth(key);
  date.setMonth(date.getMonth() + by);
  return monthKey(formatLocalDate(date));
}

function localeWeekStart(locale: string): 0 | 1 {
  try {
    const info = (
      new Intl.Locale(locale) as Intl.Locale & {
        weekInfo?: { firstDay: number };
        getWeekInfo?: () => { firstDay: number };
      }
    );
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    return first === 7 ? 0 : first === 1 ? 1 : 0;
  } catch {
    return 0;
  }
}

export function Calendar({
  value,
  onChange,
  today,
  min,
  max,
  marked,
  locale = "en-US",
  weekStartsOn,
  className,
  autoFocus,
}: CalendarProps) {
  const start = weekStartsOn ?? localeWeekStart(locale);
  const [month, setMonth] = React.useState(() => monthKey(value ?? today ?? formatLocalDate(new Date())));
  const [focused, setFocused] = React.useState<string | null>(null);
  const markedSet = React.useMemo(() => new Set(marked ?? []), [marked]);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const [seenValue, setSeenValue] = React.useState(value);
  if (seenValue !== value) {
    setSeenValue(value);
    if (value) setMonth(monthKey(value));
  }

  const inRange = React.useCallback(
    (d: string) => (!min || d >= min) && (!max || d <= max),
    [min, max],
  );

  const weeks = React.useMemo(() => {
    const first = firstOfMonth(month);
    const lead = (first.getDay() - start + 7) % 7;
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - lead);
    const rows: { localDate: string; inMonth: boolean }[][] = [];
    for (let w = 0; w < 6; w += 1) {
      const row: { localDate: string; inMonth: boolean }[] = [];
      for (let d = 0; d < 7; d += 1) {
        const localDate = formatLocalDate(cursor);
        row.push({ localDate, inMonth: monthKey(localDate) === month });
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(row);
      if (w >= 3 && monthKey(formatLocalDate(cursor)) !== month) break;
    }
    return rows;
  }, [month, start]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    firstOfMonth(month),
  );
  const weekdayNames = React.useMemo(() => {
    const narrow = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const base = parseLocalDate("2024-01-07");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + ((start + i) % 7));
      return narrow.format(d);
    });
  }, [locale, start]);
  const dayLabel = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    [locale],
  );

  const days = weeks.flat();
  const tabStop =
    (focused && days.some((d) => d.localDate === focused) && focused) ||
    (value && days.some((d) => d.localDate === value && inRange(value)) && value) ||
    (today && days.some((d) => d.localDate === today && inRange(today)) && today) ||
    days.find((d) => d.inMonth && inRange(d.localDate))?.localDate ||
    null;

  function focusDay(localDate: string) {
    setFocused(localDate);
    if (monthKey(localDate) !== month) setMonth(monthKey(localDate));
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${localDate}"]`)?.focus();
    });
  }

  React.useEffect(() => {
    if (!autoFocus) return;
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [autoFocus]);

  function onKeyDown(event: React.KeyboardEvent, localDate: string) {
    const date = parseLocalDate(localDate);
    const move = (days: number) => {
      date.setDate(date.getDate() + days);
      focusDay(formatLocalDate(date));
    };
    switch (event.key) {
      case "ArrowLeft": move(-1); break;
      case "ArrowRight": move(1); break;
      case "ArrowUp": move(-7); break;
      case "ArrowDown": move(7); break;
      case "Home": move(-((date.getDay() - start + 7) % 7)); break;
      case "End": move(6 - ((date.getDay() - start + 7) % 7)); break;
      case "PageUp": date.setMonth(date.getMonth() - 1); focusDay(formatLocalDate(date)); break;
      case "PageDown": date.setMonth(date.getMonth() + 1); focusDay(formatLocalDate(date)); break;
      default: return;
    }
    event.preventDefault();
  }

  const prevDisabled = Boolean(min && shiftMonth(month, 0) <= monthKey(min));
  const nextDisabled = Boolean(max && month >= monthKey(max));

  return (
    <div data-slot="calendar" className={cn("grid w-[calc(7*2.25rem+6*0.25rem)] gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Previous month"
          icon={CaretLeft}
          size="sm"
          noTooltip
          disabled={prevDisabled}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        />
        <p aria-live="polite" className="type-label font-medium text-ink">
          {monthLabel}
        </p>
        <IconButton
          label="Next month"
          icon={CaretRight}
          size="sm"
          noTooltip
          disabled={nextDisabled}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        />
      </div>

      <div ref={gridRef} role="grid" aria-label={monthLabel} className="grid gap-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {weekdayNames.map((name) => (
            <span key={name} role="columnheader" className="type-micro text-center text-fg-3">
              {name.slice(0, 2)}
            </span>
          ))}
        </div>
        {weeks.map((row, i) => (
          <div key={i} role="row" className="grid grid-cols-7 gap-1">
            {row.map(({ localDate, inMonth }) => {
              const selected = localDate === value;
              const isToday = localDate === today;
              const enabled = inRange(localDate);
              const isMarked = markedSet.has(localDate);
              return (
                <button
                  key={localDate}
                  type="button"
                  role="gridcell"
                  data-date={localDate}
                  aria-selected={selected || undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={dayLabel.format(parseLocalDate(localDate))}
                  tabIndex={localDate === tabStop ? 0 : -1}
                  disabled={!enabled}
                  onFocus={() => setFocused(localDate)}
                  onKeyDown={(e) => onKeyDown(e, localDate)}
                  onClick={() => onChange?.(localDate)}
                  className={cn(
                    "relative grid size-9 place-items-center rounded-item type-body tabular-nums outline-none press",
                    selected ? "keycap font-medium" : "hover:bg-fill",
                    !selected && !inMonth && "text-fg-3",
                    !selected && inMonth && "text-ink",
                    isToday && !selected && "inset-ring-1 inset-ring-ink",
                    "disabled:pointer-events-none disabled:opacity-(--muted)",
                  )}
                >
                  {Number(localDate.slice(8))}
                  {isMarked ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute bottom-1 size-1 rounded-pill",
                        selected ? "bg-on-brand" : "bg-brand",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

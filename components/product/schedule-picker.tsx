"use client";

import { useState } from "react";

import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { WeekdayPicker, type WeekdayOption } from "@/components/ui/weekday-picker";
import {
  maxTimesPerWeek,
  weekdayKeys,
  type ScheduleInput,
  type WeekdayKey,
} from "@/lib/pulse/schedule-core";

const weekdayOptions: WeekdayOption[] = weekdayKeys.map((day) => ({
  value: day,
  short: day.slice(0, 1).toUpperCase(),
  label: { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" }[day],
}));

const defaultDays: WeekdayKey[] = ["mon", "wed", "fri"];

export function SchedulePicker({
  defaultValue = { kind: "daily" },
  disabled,
  label = "How often",
  labelHidden = false,
}: {
  defaultValue?: ScheduleInput;
  disabled?: boolean;
  label?: string;
  labelHidden?: boolean;
}) {
  const [kind, setKind] = useState<ScheduleInput["kind"]>(defaultValue.kind);
  const [days, setDays] = useState<string[]>(
    defaultValue.kind === "weekdays" ? defaultValue.days : defaultDays,
  );
  const [timesPerWeek, setTimesPerWeek] = useState(
    defaultValue.kind === "weekly" ? defaultValue.timesPerWeek : 3,
  );

  return (
    <fieldset className="grid gap-3" disabled={disabled}>
      <legend className={labelHidden ? "sr-only" : "mb-2 type-label text-fg-2"}>{label}</legend>
      <Segmented
        label={label}
        name="scheduleKind"
        value={kind}
        disabled={disabled}
        onValueChange={(value) => setKind(value as ScheduleInput["kind"])}
        options={[
          { value: "daily", label: "Every day" },
          { value: "weekdays", label: "Set days" },
          { value: "weekly", label: "Times a week" },
        ]}
      />
      {kind === "weekdays" ? (
        <WeekdayPicker
          label="Days this habit is due"
          name="weekdays"
          options={weekdayOptions}
          value={days}
          disabled={disabled}
          onValueChange={setDays}
        />
      ) : null}
      {kind === "weekly" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Stepper
            label="Times a week"
            name="timesPerWeek"
            value={timesPerWeek}
            min={1}
            max={maxTimesPerWeek}
            onChange={setTimesPerWeek}
          />
          <span className="type-caption text-fg-2">times a week, on any days</span>
        </div>
      ) : null}
      <p className="type-small text-fg-2">
        {kind === "weekly"
          ? "Counts weeks in a row when you reach the target. Weeks start on Monday."
          : "The first missed due day each week is forgiven, so one off day won't break your run."}
      </p>
    </fieldset>
  );
}

"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

/**
 * A frame for a recharts chart: a labelled figure with a hidden data table
 * so the numbers never depend on the SVG. Series colours are tokens passed
 * as `var(--color-*)`. Axis and grid colours come from globals.css.
 */
export function ChartFrame({
  label,
  height = "md",
  table,
  className,
  children,
}: {
  label: string;
  height?: "sm" | "md";
  table?: { head: string[]; rows: (string | number)[][] };
  className?: string;
  children: React.ReactElement;
}) {
  return (
    <figure data-chart aria-label={label} className={cn("grid gap-2", className)}>
      <div className={cn("w-full", height === "md" ? "h-64" : "h-40")}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {table ? (
        <table className="sr-only">
          <caption>{label}</caption>
          <thead>
            <tr>
              {table.head.map((cell) => (
                <th key={cell} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}

export type ChartTooltipRow = { label: string; value: string };

/**
 * Tooltip content for recharts. Pass `format` to turn the hovered point into
 * a title and rows. Styled like the system tooltip: ink, small, no border.
 */
export function ChartTooltip<T>({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: Array<{ payload?: T }>;
  format: (point: T) => { title: string; rows: ChartTooltipRow[] };
}) {
  const point = payload?.[0]?.payload;
  if (!active || point === undefined) return null;
  const { title, rows } = format(point);
  return (
    <div className="grid min-w-36 gap-1 rounded-item bg-ink px-3 py-2 type-small text-on-ink">
      <div className="font-medium">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <span className="opacity-(--soft)">{row.label}</span>
          <span className="font-medium tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export const chartCursor = { stroke: "var(--rule)", strokeWidth: 1 } as const;
export const chartBarCursor = { fill: "var(--fill)" } as const;

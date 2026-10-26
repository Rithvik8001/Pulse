import { StatStrip } from "@/components/product/stat-strip";

/** Legacy shape kept for pages not yet migrated. Use StatStrip. */
export type StatTile = {
  label: string;
  value: string;
  hint?: string;
  dotClassName?: string;
};

export function StatGridCard({ tiles }: { tiles: StatTile[]; caption?: string; rangeLabel?: string; footerHref?: string; footerLabel?: string }) {
  return <StatStrip stats={tiles.map(({ label, value }) => ({ label, value }))} />;
}

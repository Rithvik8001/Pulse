import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignSink } from "./sink";

export const metadata: Metadata = {
  title: "Design kit · Pulse",
};

/** Every primitive in every state. Development only. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSink />;
}

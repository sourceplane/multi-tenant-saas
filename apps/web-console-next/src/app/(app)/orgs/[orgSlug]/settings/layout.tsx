import * as React from "react";

/**
 * Settings content frame. The settings navigation itself lives in the left
 * sidebar (it replaces the product nav while inside `/settings`, à la Vercel),
 * so the content area is just a comfortably-wide, centered column that holds the
 * stacked settings cards.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}

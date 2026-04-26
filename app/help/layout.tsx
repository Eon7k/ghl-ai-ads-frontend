import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & user guide | SkyVault AI Allocation",
  description:
    "Step-by-step help for Home, campaigns, Creative Library, connect ad accounts, Campaign Manager, content strategy, and agency client switching.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

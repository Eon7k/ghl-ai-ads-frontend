import { redirect } from "next/navigation";

/** Competitors home opens Ads Library research; watches live under `/competitors/watches`. */
export default function CompetitorsRootPage() {
  redirect("/competitors/harvest");
}

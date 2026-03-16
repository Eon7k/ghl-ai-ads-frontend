import ExperimentsAuthGuard from "./ExperimentsAuthGuard";

export default function ExperimentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExperimentsAuthGuard>{children}</ExperimentsAuthGuard>;
}

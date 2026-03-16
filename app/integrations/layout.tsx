import AuthGuard from "@/components/AuthGuard";

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}

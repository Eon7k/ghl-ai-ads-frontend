import AuthGuard from "@/components/AuthGuard";
import AppNav from "@/components/AppNav";

export default function BusinessOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppNav />
      {children}
    </AuthGuard>
  );
}

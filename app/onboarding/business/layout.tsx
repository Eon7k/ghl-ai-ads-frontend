import AuthGuard from "@/components/AuthGuard";
import AppNav from "@/components/AppNav";

export default function BusinessOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppNav />
      <div id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </div>
    </AuthGuard>
  );
}

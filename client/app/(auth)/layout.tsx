import { ZenithLogo } from "@/components/brand/ZenithLogo";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthCardEntrance } from "@/components/auth/AuthCardEntrance";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-soft opacity-50 blur-3xl"
      />
      <ZenithLogo href="/" className="relative z-10 mb-8" />
      <AuthCardEntrance className="relative z-10 w-full max-w-sm">{children}</AuthCardEntrance>
      <Sonner />
    </div>
  );
}

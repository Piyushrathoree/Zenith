import { ZenithLogo } from "@/components/brand/ZenithLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <ZenithLogo href="/" className="mb-8" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

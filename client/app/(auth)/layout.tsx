import { ZenithLogo } from "@/components/brand/ZenithLogo";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthCardEntrance } from "@/components/auth/AuthCardEntrance";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-muted/50 px-4 py-8 font-alan text-foreground md:px-6 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-soft opacity-60 blur-3xl"
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-stretch overflow-hidden rounded-3xl border border-border bg-background shadow-soft">
        <aside className="hidden w-1/2 flex-col justify-between border-r border-border bg-paper p-10 lg:flex">
          <div>
            <ZenithLogo href="/" />
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Start Calm. Stay Focused. End Confident.
            </p>
            <h1 className="mt-4 max-w-md font-instrument text-5xl leading-[1.05] tracking-tight text-foreground text-shadow-soft">
              Plan less chaos into your day.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Bring your tasks into one clear flow, focus on what matters, and close the day with confidence.
            </p>
          </div>
          <div className="grid gap-3">
            {["Unified task inbox", "Focus sessions with ritual flow", "Free plan + 7 day Pro trial"].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-inset-soft"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex w-full flex-1 items-center justify-center p-5 sm:p-8 lg:w-1/2 lg:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex justify-center lg:hidden">
              <ZenithLogo href="/" />
            </div>
            <AuthCardEntrance className="w-full">{children}</AuthCardEntrance>
          </div>
        </div>
      </div>
      <Sonner />
    </div>
  );
}

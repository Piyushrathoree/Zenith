import { ZenithLogo } from "@/components/brand/ZenithLogo";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthCardEntrance } from "@/components/auth/AuthCardEntrance";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const highlights = ["Unified task inbox", "Focus sessions with ritual flow", "Free plan + 7 day Pro trial"];

  return (
    <div className="relative min-h-screen overflow-hidden bg-muted/50 px-3 py-4 font-alan text-foreground sm:px-4 sm:py-8 md:px-6 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-soft opacity-60 blur-3xl"
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-stretch overflow-hidden rounded-3xl border border-border bg-background shadow-soft sm:min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-[46%] flex-col justify-between border-r border-border bg-paper p-8 md:flex lg:p-10">
          <div>
            <ZenithLogo href="/" />
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Start Calm. Stay Focused. End Confident.
            </p>
            <h1 className="mt-4 max-w-md font-instrument text-4xl leading-[1.05] tracking-tight text-foreground text-shadow-soft lg:text-5xl">
              Plan less chaos into your day.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Bring your tasks into one clear flow, focus on what matters, and close the day with confidence.
            </p>
          </div>
          <div className="grid gap-3">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-inset-soft"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex w-full flex-1 items-center justify-center p-4 sm:p-6 md:w-[54%] md:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-5 flex flex-col gap-4 md:hidden">
              <ZenithLogo href="/" />
              <div className="rounded-2xl border border-border bg-paper p-4 shadow-inset-soft">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Start Calm. Stay Focused. End Confident.
                </p>
                <p className="mt-2 text-sm text-foreground">Plan your day clearly, focus deeply, and finish in control.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <AuthCardEntrance className="w-full">{children}</AuthCardEntrance>
          </div>
        </div>
      </div>
      <Sonner />
    </div>
  );
}

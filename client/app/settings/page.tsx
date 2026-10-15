"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Moon, Sun } from "lucide-react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import type { UpdateUserPayload } from "@/lib/api/auth";
import {
  disconnectCalendar,
  getCalendarStatus,
  startCalendarConnect,
  type CalendarStatus,
} from "@/lib/api/calendar";

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password must be at most 20 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        "Password needs an uppercase letter, a lowercase letter, and a number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <p className="text-sm font-medium text-foreground">Appearance</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        How Zenith looks on this device.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-foreground/10 bg-muted/30 px-3 py-3">
        <div className="flex items-center gap-3">
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-tag-work" />
          )}
          <div>
            <p className="text-sm text-foreground">Dark mode</p>
            <p className="text-xs text-muted-foreground">Applies across the app.</p>
          </div>
        </div>
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Toggle dark mode"
        />
      </div>
    </section>
  );
}

function PreferencesSection() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const timezone = user?.timezone ?? "UTC";
  const weekStartsOn = user?.weekStartsOn ?? 1;
  const weeklyEmail = user?.emailPrefs?.weeklyBacklogDigest ?? true;

  // The saved zone is added to the list if the runtime does not report it, so the select can always show it.
  const timeZones = Array.from(
    new Set(["UTC", ...Intl.supportedValuesOf("timeZone"), timezone])
  );

  const save = async (payload: UpdateUserPayload, message: string) => {
    try {
      await updateProfile(payload);
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your settings");
    }
  };

  return (
    <section id="preferences" className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <p className="text-sm font-medium text-foreground">Preferences</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Used for what counts as today, your weekly planning, and emails.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-3">
          <div>
            <p className="text-sm text-foreground">Timezone</p>
            <p className="text-xs text-muted-foreground">Decides when your day starts and ends.</p>
          </div>
          <Select
            value={timezone}
            disabled={!user}
            onValueChange={(value) => save({ timezone: value }, "Timezone saved")}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {timeZones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-3">
          <div>
            <p className="text-sm text-foreground">Week starts on</p>
            <p className="text-xs text-muted-foreground">Used for weekly planning.</p>
          </div>
          <Select
            value={String(weekStartsOn)}
            disabled={!user}
            onValueChange={(value) =>
              save({ weekStartsOn: Number(value) as 0 | 1 }, "Week start saved")
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="0">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-3">
          <div>
            <p className="text-sm text-foreground">Weekly backlog email</p>
            <p className="text-xs text-muted-foreground">
              Once a week, a summary of tasks that moved to your backlog.
            </p>
          </div>
          <Switch
            checked={weeklyEmail}
            disabled={!user}
            onCheckedChange={(checked) =>
              save({ emailPrefs: { weeklyBacklogDigest: checked } }, "Email preference saved")
            }
            aria-label="Weekly backlog email"
          />
        </div>
      </div>
    </section>
  );
}

const REMINDER_OPTIONS = [0, 5, 10, 15, 30];

function calendarErrorMessage(reason: string | null): string {
  if (reason === "denied") return "You cancelled the Google permission screen";
  return "Could not connect Google Calendar, please try again";
}

function CalendarSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getCalendarStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, status: null }));
  }, []);

  // Google sends the browser back here with the result in the URL. Show it once, then clean the URL.
  useEffect(() => {
    const result = searchParams.get("calendar");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google Calendar connected");
      getCalendarStatus().then(setStatus).catch(() => undefined);
    } else {
      toast.error(calendarErrorMessage(searchParams.get("reason")));
    }
    router.replace("/settings");
  }, [searchParams, router]);

  const connect = () => {
    setConnecting(true);
    startCalendarConnect().catch(() => {
      toast.error("Could not start the Google connection, please try again");
      setConnecting(false);
    });
  };

  const disconnect = async () => {
    try {
      await disconnectCalendar();
      setStatus({ connected: false, status: null });
      toast.success("Google Calendar disconnected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Google Calendar");
    }
  };

  const saveReminder = async (minutes: number) => {
    try {
      await updateProfile({ calendarReminderMinutes: minutes });
      toast.success("Reminder saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the reminder");
    }
  };

  const reminder = user?.calendarReminderMinutes ?? 10;

  return (
    <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <p className="text-sm font-medium text-foreground">Google Calendar</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Time boxed tasks appear in a Zenith calendar, so your phone reminds you before each one.
      </p>

      {status === null && <p className="mt-4 text-sm text-muted-foreground">Checking...</p>}

      {status && !status.connected && (
        <Button type="button" variant="brand" className="mt-4" onClick={connect} disabled={connecting}>
          {connecting ? "Opening Google..." : "Connect Google Calendar"}
        </Button>
      )}

      {status?.connected && status.status === "active" && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground">
            Connected. Tasks with a time appear in your Zenith calendar.
          </p>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-3">
            <div>
              <p className="text-sm text-foreground">Remind me</p>
              <p className="text-xs text-muted-foreground">Before each task starts.</p>
            </div>
            <Select value={String(reminder)} onValueChange={(value) => saveReminder(Number(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes === 0 ? "No reminder" : `${minutes} minutes before`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            On your phone, allow notifications for the Calendar app (iPhone) or Google Calendar (Android),
            and keep the Zenith calendar turned on.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">Disconnect</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the Zenith calendar and all its events from your Google account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={disconnect}
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {status?.connected && status.status === "revoked" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-destructive">Google access expired. Reconnect to keep syncing.</p>
          <Button type="button" variant="brand" onClick={connect} disabled={connecting}>
            Reconnect
          </Button>
        </div>
      )}
    </section>
  );
}

function PlanSection() {
  const plan = useAuthStore((state) => state.user?.plan) ?? "free";
  const isPro = plan === "pro";

  return (
    <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Plan</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPro
              ? "Pro unlocks integrations and higher limits."
              : "Free covers the day board and focus timer."}
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          {isPro ? "Pro" : "Free"}
        </span>
      </div>
    </section>
  );
}

function ChangePasswordSection() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/auth/change-password", {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed");
      form.reset();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "Could not change your password";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <p className="text-sm font-medium text-foreground">Password</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Used when you sign in with email.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="brand" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </section>
  );
}

function AccountSection() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const email = useAuthStore((state) => state.user?.email);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
      <p className="text-sm font-medium text-foreground">Session</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {email ?? "Signed in"}
      </p>
      <Button variant="destructive" className="mt-4" onClick={handleLogout}>
        Log out
      </Button>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <RequireAuth>
        <div className="min-h-screen bg-background px-4 py-10 font-alan">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <div className="mb-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <p className="text-sm font-medium text-foreground">Settings</p>
            </div>
            <AppearanceSection />
            <PreferencesSection />
            {/* useSearchParams needs a Suspense boundary so the page can still prerender. */}
            <Suspense fallback={null}>
              <CalendarSection />
            </Suspense>
            <PlanSection />
            <ChangePasswordSection />
            <AccountSection />
          </div>
        </div>
      </RequireAuth>
      <Sonner />
    </>
  );
}

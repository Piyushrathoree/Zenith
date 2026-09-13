"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

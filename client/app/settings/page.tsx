"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Moon, Sun } from "lucide-react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Mirrors server/src/modules/auth/auth.schema.ts ChangePasswordSchema.
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

function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Appearance</CardTitle>
        <CardDescription>Choose how Zenith looks on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Dark mode</p>
              <p className="text-xs text-muted-foreground">
                Switches the whole app between light and dark themes.
              </p>
            </div>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard() {
  const plan = useAuthStore((state) => state.user?.plan) ?? "free";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plan</CardTitle>
        <CardDescription>
          You are currently on the {plan === "pro" ? "Pro" : "Free"} plan.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ChangePasswordCard() {
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
      toast.success("Password changed successfully");
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Change password</CardTitle>
        <CardDescription>
          Update the password used to sign in with email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
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
                  <FormLabel>New password</FormLabel>
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
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Change password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AccountCard() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const email = useAuthStore((state) => state.user?.email);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account</CardTitle>
        <CardDescription>{email ?? "Signed in"}</CardDescription>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        <Button variant="destructive" onClick={handleLogout}>
          Log out
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <RequireAuth>
        <div className="min-h-screen bg-background px-4 py-10">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
                Back to dashboard
              </Link>
            </div>
            <AppearanceCard />
            <PlanCard />
            <ChangePasswordCard />
            <AccountCard />
          </div>
        </div>
      </RequireAuth>
      <Sonner />
    </>
  );
}

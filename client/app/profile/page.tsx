"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/auth";
import { GoogleMark } from "@/components/brand/GoogleMark";
import { GitHubMark } from "@/components/brand/GitHubMark";
import { cn } from "@/lib/utils";

type ProfileUser = AuthUser & {
  googleId?: string;
  githubId?: string;
};

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(20, "Name is too long"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function initials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfileContent() {
  const user = useAuthStore((state) => state.user) as ProfileUser | null;
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "" },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/auth/update/${user._id}`, { name: values.name });
      loadFromStorage();
      toast.success("Profile updated");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "Could not update your profile";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6 text-sm text-muted-foreground shadow-soft">
        Loading profile…
      </div>
    );
  }

  const isTrialActive = Boolean(
    user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()
  );
  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const connected = [
    user.googleId ? { name: "Google", icon: GoogleMark } : null,
    user.githubId ? { name: "GitHub", icon: GitHubMark } : null,
  ].filter(Boolean) as { name: string; icon: typeof GoogleMark }[];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-foreground/10">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-brand-soft text-lg font-medium text-brand">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-medium text-foreground">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            {planLabel} plan
          </span>
          {isTrialActive && user.trialEndsAt ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Trial until {new Date(user.trialEndsAt).toLocaleDateString()}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              user.isVerified
                ? "bg-health-soft text-tag-health"
                : "bg-muted text-muted-foreground"
            )}
          >
            {user.isVerified ? "Email verified" : "Email not verified"}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
        <p className="text-sm font-medium text-foreground">Display name</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          This is how you show up across Zenith. Email stays locked to this account.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="brand" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </form>
        </Form>
      </section>

      <section className="rounded-2xl border-2 border-foreground/15 bg-card p-6 shadow-soft">
        <p className="text-sm font-medium text-foreground">How you sign in</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-2.5">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Email and password</span>
          </div>
          {connected.length > 0 ? (
            connected.map((account) => (
              <div
                key={account.name}
                className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-2.5"
              >
                <account.icon />
                <span className="text-sm text-foreground">{account.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">Connected</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No Google or GitHub account is linked yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <RequireAuth>
        <div className="min-h-screen bg-background px-4 py-10 font-alan">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-6 flex items-center justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <p className="text-sm font-medium text-foreground">Profile</p>
            </div>
            <ProfileContent />
          </div>
        </div>
      </RequireAuth>
      <Sonner />
    </>
  );
}

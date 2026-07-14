"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/auth";

// The AuthUser type (client/lib/api/auth.ts) does not declare googleId /
// githubId since auth.ts is owned by another workstream. The backend user
// record does carry them (see server/src/modules/auth/auth.model.ts), so we
// widen the type locally, purely for display, instead of editing auth.ts.
type ProfileUser = AuthUser & {
  googleId?: string;
  githubId?: string;
};

// Mirrors server/src/modules/auth/auth.schema.ts UpdateUserSchema (name only,
// this page does not offer avatar/password editing).
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
      // useAuthStore does not expose a direct setter for `user` (that file is
      // owned by another workstream), so we refresh from storage - the PUT
      // already persisted the change server side, so this simply re-fetches
      // the now-updated record via the existing token.
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
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading profile...
        </CardContent>
      </Card>
    );
  }

  const isTrialActive = Boolean(user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now());
  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const providers = [
    user.googleId ? "Google" : null,
    user.githubId ? "GitHub" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={planLabel === "Pro" ? "default" : "secondary"}>{planLabel} plan</Badge>
            {isTrialActive && user.trialEndsAt ? (
              <Badge variant="outline">
                Trial active until {new Date(user.trialEndsAt).toLocaleDateString()}
              </Badge>
            ) : null}
            {user.isVerified ? (
              <Badge variant="outline">Email verified</Badge>
            ) : (
              <Badge variant="outline">Email not verified</Badge>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Connected accounts</p>
            {providers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <Badge key={provider} variant="secondary">
                    {provider}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No third-party accounts connected. You are signed in with email and password.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit profile</CardTitle>
          <CardDescription>Update the name shown across Zenith.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Ada Lovelace" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Email cannot be changed from this page.
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <RequireAuth>
        <div className="min-h-screen bg-background px-4 py-10">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
                Back to dashboard
              </Link>
            </div>
            <ProfileContent />
          </div>
        </div>
      </RequireAuth>
      <Sonner />
    </>
  );
}

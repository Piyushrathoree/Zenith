"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GitHubMark } from "@/components/brand/GitHubMark";
import { GoogleMark } from "@/components/brand/GoogleMark";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiRequestError } from "@/lib/api/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "Unable to sign in, please try again";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToProvider = (provider: "google" | "github") => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/${provider}`;
  };

  return (
    <Card className="rounded-2xl border-border/90 bg-card/95 shadow-inset-soft backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <CardHeader className="space-y-2 px-5 pt-6 sm:px-7 sm:pt-7">
        <CardTitle className="font-instrument text-2xl font-medium tracking-tight sm:text-3xl">Log in</CardTitle>
        <CardDescription>Welcome back, enter your details to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 sm:px-7 sm:pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="brand" className="h-11 w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Log in"}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-center bg-background/60"
            onClick={() => goToProvider("google")}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-center bg-background/60"
            onClick={() => goToProvider("github")}
          >
            <GitHubMark />
            Continue with GitHub
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center px-5 pb-6 text-center text-sm text-muted-foreground sm:px-7 sm:pb-7">
        Don&apos;t have an account?
        <Link href="/signup" className="ml-1 font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}

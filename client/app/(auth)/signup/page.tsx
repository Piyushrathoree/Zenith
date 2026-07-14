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
import { useAuthStore } from "@/store/useAuthStore";
import { ApiRequestError } from "@/lib/api/client";

// Mirrors server/src/modules/auth/auth.schema.ts RegisterUserSchema.
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(20, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      "Password needs an uppercase letter, a lowercase letter, and a number"
    ),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitting(true);
    try {
      await registerUser(values);
      toast.success("Account created");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "Unable to create your account";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToProvider = (provider: "google" | "github") => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/${provider}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start calm, stay focused, end confident.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ada Lovelace" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button type="button" variant="outline" onClick={() => goToProvider("google")}>
            Continue with Google
          </Button>
          <Button type="button" variant="outline" onClick={() => goToProvider("github")}>
            Continue with GitHub
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?
        <Link href="/login" className="ml-1 font-medium text-foreground hover:underline">
          Log in
        </Link>
      </CardFooter>
    </Card>
  );
}

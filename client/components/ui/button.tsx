import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl  text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.25),inset_0_1px_0_rgb(255_255_255_/_0.12)] hover:bg-primary/90 hover:shadow-[0_2px_6px_rgb(0_0_0_/_0.22),inset_0_1px_0_rgb(255_255_255_/_0.14)] active:translate-y-px active:shadow-[0_1px_1px_rgb(0_0_0_/_0.2)]",
        brand:
          "bg-brand text-brand-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.18),inset_0_1px_0_rgb(255_255_255_/_0.25)] hover:bg-brand/90 hover:shadow-[0_2px_6px_rgb(0_0_0_/_0.16),inset_0_1px_0_rgb(255_255_255_/_0.3)] active:translate-y-px active:shadow-[0_1px_1px_rgb(0_0_0_/_0.14)]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgb(0_0_0_/_0.18)] hover:bg-destructive/90 hover:shadow-[0_2px_5px_rgb(0_0_0_/_0.16)] active:translate-y-px focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.05),inset_0_1px_0_rgb(255_255_255_/_0.55)] hover:bg-muted/70 hover:shadow-[0_2px_5px_rgb(0_0_0_/_0.07),inset_0_1px_0_rgb(255_255_255_/_0.6)] active:translate-y-px dark:bg-card/70 dark:hover:bg-muted/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.03)] hover:bg-secondary/80",
        ghost:
          "border border-border/80 bg-card/90 text-foreground shadow-[0_1px_2px_rgb(0_0_0_/_0.04),inset_0_1px_0_rgb(255_255_255_/_0.45)] hover:bg-muted/70 hover:border-border hover:shadow-[0_2px_5px_rgb(0_0_0_/_0.06),inset_0_1px_0_rgb(255_255_255_/_0.55)] active:translate-y-px dark:bg-card/50 dark:hover:bg-muted/45",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-1 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

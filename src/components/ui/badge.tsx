import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/src/utils/cn";

// `Badge` is the text status-pill primitive - small rounded label for status,
// counts, and metadata (e.g. "Current plan", "Setup Required").
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        accent:
          "border-transparent bg-accent text-accent-foreground [a&]:hover:bg-accent/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        // white solid pill for use on coloured surfaces
        light:
          "border-transparent bg-white text-secondary [a&]:hover:bg-white/90",
        // soft coral tint - reads as a gentle caution
        warning: "border-warning/30 bg-warning/10 text-warning",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline:
          "bg-transparent text-foreground [a&]:hover:bg-muted [a&]:hover:text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5",
        md: "px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "sm",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

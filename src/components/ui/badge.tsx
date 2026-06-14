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
        // solid mint (primary CTA colour) with navy text - high-emphasis pills
        // and count badges
        primary:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
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
      shape: {
        // text label with horizontal padding - the default badge
        pill: "",
        // fixed-diameter round badge for counts / single glyphs; the per-size
        // dimensions come from the compound variants below
        circle: "p-0",
      },
    },
    compoundVariants: [
      { shape: "circle", size: "sm", className: "h-5 min-w-5" },
      { shape: "circle", size: "md", className: "h-6 min-w-6" },
    ],
    defaultVariants: {
      variant: "secondary",
      size: "sm",
      shape: "pill",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  shape,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

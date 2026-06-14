import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/utils/cn";

// `Card` is the surface/container primitive — use it for any styled surface (box,
// panel, sidebar tile, form shell), and compose it for domain cards with bespoke
// headers (e.g. TaskCard, StudentProfileCard). The sub-components below are optional.
//
// Axes: surface colour, padding, elevation, border.
// - `variant` standardises the raw surface hexes onto tokens
//   Each carries a border *colour* (no-op until `border` adds the width).
// - `padding` is full-box p-* so a bare <Card>…</Card> is correctly padded
// - `shadow` is opt-in elevation;
// - `border` is opt-in (most cards here separate by shadow, not stroke).
const cardVariants = cva("flex flex-col rounded-2xl", {
  variants: {
    variant: {
      light: "bg-white text-[#1F2E3B] border-black/10",
      dark: "bg-card text-white border-white/10",
      accent: "bg-accent text-[#1F2E3B] border-black/10",
      secondary: "bg-secondary text-white border-white/10",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
    shadow: {
      none: "shadow-none",
      sm: "shadow-sm",
      md: "shadow-(--shadow-card)",
      lg: "shadow-lg",
    },
    border: {
      true: "border",
      false: "",
    },
  },
  defaultVariants: {
    variant: "light",
    padding: "md",
    shadow: "md",
    border: false,
  },
});

function Card({
  className,
  variant,
  padding,
  shadow,
  border,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(
        cardVariants({ variant, padding, shadow, border }),
        className,
      )}
      {...props}
    />
  );
}

// Sub-components are layout/typography only they carry NO padding of their own
// So they live inside the Card's padding (no double-padding). Use them for the
// title/description/action header pattern;
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-b1 font-semibold leading-snug", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-b6 text-grey-3", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};

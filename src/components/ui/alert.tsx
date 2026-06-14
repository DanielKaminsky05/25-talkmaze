import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/utils/cn";

// `Alert` is the block-level status-banner primitive - a tinted, rounded
// for page/section status (errors, warnings, info).
// An optional leading icon (a `lucide-react` svg) can be passed as the first
// child.
// For short inline status pills use `Badge` instead; for inline field
// validation use `Field`'s `FieldError` instead.
const alertVariants = cva(
  "group/alert relative grid w-full items-start gap-x-2.5 gap-y-1 rounded-lg border text-left has-[>svg]:grid-cols-[auto_1fr] [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        // neutral surface - sits on white cards
        default: "border-border bg-card text-card-foreground",
        // soft red tint - errors / failures
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90",
        // soft coral tint - gentle caution (matches Badge's `warning`)
        warning:
          "border-warning/30 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

function Alert({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-2",
        className,
      )}
      {...props}
    />
  );
}

// Optional top-right slot for an action (e.g. a dismiss button).
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };

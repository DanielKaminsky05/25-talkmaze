import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/src/utils/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#24394a]",
        dark: "bg-[#1F2E3B] text-white hover:bg-[#162230]",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
        outline:
          "border border-white/20 text-white/60 bg-transparent hover:text-white hover:border-white/40",
        ghost:
          "bg-transparent text-[#B1E7D6] hover:text-white hover:bg-white/5",
        destructive: "bg-destructive text-white hover:bg-destructive/80",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-7 px-3 text-sm rounded-lg",
        md: "h-9 px-4 text-sm rounded-lg",
        lg: "h-11 px-6 text-base rounded-xl",
        xl: "h-13 px-8 text-base rounded-xl",
        icon: "size-8 rounded-lg",
      },
      rounded: {
        default: "",
        full: "rounded-full",
        xl: "rounded-xl",
      },
      // Elevation is orthogonal to size
      shadow: {
        true: "shadow-[var(--shadow-button)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      rounded: "default",
      shadow: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  rounded,
  shadow,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, rounded, shadow }),
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };

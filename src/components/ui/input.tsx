import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/utils/cn";

const inputVariants = cva(
  "w-full border transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        light:
          "bg-white text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[#1F2E3B] focus:border-primary focus:ring-1 focus:ring-primary",
        dark: "bg-card text-white placeholder-gray-500 border-accent/40 focus:border-accent",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-md",
        md: "h-10 px-4 text-base rounded-md",
        lg: "h-12 px-5 text-lg rounded-lg",
      },
      error: {
        true: "border-destructive",
        false: "",
      },
    },
    defaultVariants: {
      variant: "light",
      size: "md",
      error: false,
    },
  },
);

function Input({
  className,
  variant,
  size,
  error,
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, size, error }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };

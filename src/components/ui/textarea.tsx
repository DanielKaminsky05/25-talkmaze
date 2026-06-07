import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/utils/cn";

const textareaVariants = cva(
  "w-full resize-none border transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        light:
          "bg-white text-[#1F2E3B] placeholder-[#1F2E3B]/40 border-[#1F2E3B]/20 focus:border-primary focus:ring-1 focus:ring-primary",
        dark: "bg-card text-white placeholder-gray-500 border-accent/40 focus:border-accent",
      },
      size: {
        sm: "px-3 py-2 text-sm rounded-md",
        md: "px-4 py-2.5 text-base rounded-md",
        lg: "px-5 py-3 text-lg rounded-lg",
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

function Textarea({
  className,
  variant,
  size,
  error,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant, size, error }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };

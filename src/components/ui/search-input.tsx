import * as React from "react";

import { Input } from "@/src/components/ui/input";
import { SearchIcon } from "@/src/components/ui/icons";
import { cn } from "@/src/utils/cn";

// `SearchInput` is the `Input` primitive with a leading search glyph. Use it
// anywhere a text field filters a list (contact picker, student list, etc.).
// It forwards every `Input` prop (including the `variant`/`size` axes), so the
// caller controls surface colour and dimensions; only the icon and left
// padding are added here.
type SearchInputProps = React.ComponentProps<typeof Input> & {
  // Styles the relative wrapper (e.g. width / margins) rather than the field.
  containerClassName?: string;
  iconSize?: number;
};

function SearchInput({
  className,
  containerClassName,
  iconSize = 20,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon size={iconSize} />
      </span>
      <Input type="search" className={cn("pl-10", className)} {...props} />
    </div>
  );
}

export { SearchInput };

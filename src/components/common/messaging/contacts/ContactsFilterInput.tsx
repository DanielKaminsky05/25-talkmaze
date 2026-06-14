import type { FC } from "react";
import { SearchInput } from "@/src/components/ui/search-input";
import { cn } from "@/src/utils/cn";

export type ContactsFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

/**
 * Contacts filter field. Thin wrapper over the shared `SearchInput` primitive
 * that keeps the messaging sidebar's transparent-on-dark look.
 */
const ContactsFilterInput: FC<ContactsFilterInputProps> = ({
  value,
  onChange,
  placeholder = "Search contacts",
  className,
  onFocus,
  onBlur,
}) => {
  return (
    <SearchInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      variant="dark"
      containerClassName="mb-3"
      className={cn(
        "h-10 rounded-[9px] border-gray-500 bg-transparent text-white placeholder:text-gray-400",
        className,
      )}
    />
  );
};

export default ContactsFilterInput;

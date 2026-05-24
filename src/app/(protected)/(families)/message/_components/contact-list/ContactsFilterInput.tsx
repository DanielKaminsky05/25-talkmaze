import type { ChangeEvent, FC } from "react";
import { SearchIcon } from "@/src/components/ui/icons";

export type ContactsFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

const ContactsFilterInput: FC<ContactsFilterInputProps> = ({
  value,
  onChange,
  placeholder = "Search contacts",
  onFocus,
  onBlur,
}) => {
  // Update the value for the controlled input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative mb-3">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon size={20} />
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-4 rounded-[9px] border border-gray-500
         placeholder:text-gray-400 text-white"
      />
    </div>
  );
};

export default ContactsFilterInput;
